import { S, setState } from '../state.js';
import { h } from '../ui.js';
import { getMsfthubUrl } from '../data.js';
import { toggleTopicDone, sendDashChat } from '../plan.js';

export function renderDashboard() {
  const { plan, progress, cert } = S.activeSession;
  const totalTopics = plan.topics?.length || 0;
  const doneTopics = Object.values(progress || {}).filter(p => p.done).length;
  const pct = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;
  const circumference = 213.6;
  const dashLen = circumference * pct / 100;
  const hubUrl = getMsfthubUrl(cert);

  // Topic selection state (in-memory per session)
  if (!S.dashSelectedTopics) S.dashSelectedTopics = {};
  const sessionKey = S.activeSession.id;
  if (!S.dashSelectedTopics[sessionKey]) S.dashSelectedTopics[sessionKey] = new Set();
  const sel = S.dashSelectedTopics[sessionKey];
  const allTitles = (plan.topics || []).map(t => t.title);

  function toggleTopic(title) { if (sel.has(title)) sel.delete(title); else sel.add(title); setState({}, false); }
  function toggleAll() { if (sel.size === allTitles.length) sel.clear(); else allTitles.forEach(t => sel.add(t)); setState({}, false); }
  const selCount = sel.size;

  // Chat box (partial-render to preserve input focus)
  const chatBox = h('div', { style: { overflowY: 'auto', maxHeight: '320px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px', flex: '1' } });

  function renderMessages() {
    chatBox.innerHTML = '';
    if (S.dashChat.length === 0) {
      chatBox.append(h('div', { style: { color: '#6b748a', fontSize: '13px', textAlign: 'center', padding: '20px 0' } },
        '💬 Ask me to add missing topics, subtopics, resources, or tips to this study plan.'));
    }
    for (const m of S.dashChat) {
      const isUser = m.role === 'user';
      chatBox.append(h('div', { style: { display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' } },
        h('div', { style: { maxWidth: '85%', padding: '10px 14px', borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px', fontSize: '13px', lineHeight: '1.6', background: isUser ? '#4f8ef7' : '#131827', color: isUser ? '#fff' : '#dde3f0', border: isUser ? 'none' : '1px solid #1e2535', whiteSpace: 'pre-wrap' } }, m.content)
      ));
    }
    if (S.dashChatLoading) {
      chatBox.append(h('div', { style: { display: 'flex', justifyContent: 'flex-start' } },
        h('div', { style: { padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: '#131827', border: '1px solid #1e2535', fontSize: '13px', color: '#6b748a', letterSpacing: '4px' } }, '● ● ●')
      ));
    }
    setTimeout(() => chatBox.scrollTop = chatBox.scrollHeight, 0);
  }

  renderMessages();
  window._dashChatRenderMessages = renderMessages;

  const chatInp = h('input', {
    style: { flex: '1', background: 'transparent', border: 'none', color: '#dde3f0', fontSize: '13px', padding: '10px 12px', outline: 'none' },
    placeholder: 'e.g. "Add a topic on Conditional Access policies" or "This cert also covers PIM"…',
    value: S.dashChatInput,
    onInput: e => { S.dashChatInput = e.target.value; },
    onKeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDashChat(); } },
  });

  return h('div', { class: 'page' },
    h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
      h('button', { class: 'btn-back', style: { padding: '0 0 20px' }, onClick: () => setState({ view: 'home' }) }, '← All certifications'),
      h('button', { class: 'btn-quiz', onClick: () => setState({ quizCert: cert, quizTopics: [], quizView: 'setup', view: 'quiz' }) }, '⚡ Full Quiz')
    ),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '20px' } },
      h('div', { style: { flex: '1' } },
        h('h1', { style: { fontSize: '26px', fontWeight: '700', marginBottom: '8px' } }, cert),
        h('p', { style: { color: '#6b748a', fontSize: '14px', lineHeight: '1.6', maxWidth: '500px' } }, plan.overview)
      ),
      h('div', { style: { position: 'relative', flexShrink: '0' } },
        h('svg', { viewBox: '0 0 80 80', width: '80', height: '80', html: `<circle cx="40" cy="40" r="34" fill="none" stroke="#1e2535" stroke-width="8"/><circle cx="40" cy="40" r="34" fill="none" stroke="#4f8ef7" stroke-width="8" stroke-dasharray="${dashLen} ${circumference}" stroke-linecap="round" transform="rotate(-90 40 40)"/>` }),
        h('div', { style: { position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
          h('span', { style: { fontSize: '18px', fontWeight: '700' } }, pct + '%'),
          h('span', { style: { fontSize: '10px', color: '#6b748a' } }, `${doneTopics}/${totalTopics}`)
        )
      )
    ),
    hubUrl && h('a', { href: hubUrl, target: '_blank', class: 'msfthub-banner' },
      h('span', { style: { fontSize: '18px' } }, '🔗'),
      h('div', {},
        h('div', { style: { fontSize: '13px', fontWeight: '600' } }, 'MSFTHub — ' + cert.toUpperCase() + ' Community Study Hub'),
        h('div', { style: { fontSize: '11px', color: '#6b748a' } }, 'Curated resources, free practice tests, labs & video courses')
      ),
      h('span', { style: { marginLeft: 'auto', color: '#4f8ef7', fontSize: '14px', flexShrink: '0' } }, '↗')
    ),
    plan.examInfo && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '32px' } },
      ...Object.entries(plan.examInfo).map(([k, v]) =>
        h('div', { class: 'exam-pill' },
          h('div', { style: { fontSize: '10px', color: '#6b748a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' } }, k.replace(/([A-Z])/g, ' $1').trim()),
          h('div', { style: { fontSize: '14px', fontWeight: '600' } }, v)
        )
      )
    ),
    plan.studyPlan?.phases?.length > 0 && h('div', { style: { marginBottom: '32px' } },
      h('h2', { class: 'section-title' }, `Study Plan — ${plan.studyPlan.totalWeeks} weeks · ${plan.studyPlan.weeklyHours}h/week`),
      h('div', { class: 'scrollx' },
        ...plan.studyPlan.phases.map(ph => h('div', { class: 'phase-card' },
          h('div', { style: { fontSize: '11px', color: '#4f8ef7', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' } }, 'Phase ' + ph.phase),
          h('div', { style: { fontWeight: '600', fontSize: '14px', marginBottom: '4px' } }, ph.name),
          h('div', { style: { fontSize: '11px', color: '#6b748a', marginBottom: '6px' } }, 'Weeks ' + ph.weeks),
          h('div', { style: { fontSize: '12px', color: '#6b748a', lineHeight: '1.5' } }, ph.focus)
        ))
      )
    ),
    // Topics grid
    h('div', { style: { marginBottom: selCount > 0 ? '80px' : '32px' } },
      h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
        h('h2', { class: 'section-title', style: { margin: '0' } }, 'Topics'),
        h('div', { class: 'flex gap-8', style: { alignItems: 'center' } },
          selCount > 0 && h('span', { style: { fontSize: '12px', color: '#f5c842' } }, '✓ ' + selCount + ' selected'),
          h('button', { style: { fontSize: '11px', color: '#6b748a', background: '#0f1320', border: '1px solid #1e2535', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }, onClick: toggleAll }, sel.size === allTitles.length ? 'Deselect all' : 'Select all')
        )
      ),
      h('div', { class: 'grid-topics' },
        ...(plan.topics || []).map(topic => {
          const tp = progress[topic.id] || {};
          const isSelected = sel.has(topic.title);
          return h('div', {
            class: 'topic-card' + (tp.done ? ' done' : '') + (isSelected ? ' topic-selected' : ''),
            style: { position: 'relative', outline: isSelected ? '2px solid #f5c842' : '2px solid transparent', outlineOffset: '2px', cursor: 'pointer' },
            onClick: () => toggleTopic(topic.title),
          },
            h('div', { style: { position: 'absolute', top: '10px', right: '10px', width: '18px', height: '18px', borderRadius: '5px', background: isSelected ? '#f5c842' : 'transparent', border: isSelected ? '2px solid #f5c842' : '2px solid #1e2535', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', transition: 'all .15s' } },
              isSelected && h('svg', { width: '10', height: '10', viewBox: '0 0 10 10', html: '<polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#080b12" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' })
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', paddingRight: '24px' } },
              h('span', { style: { fontSize: '11px', fontWeight: '700', color: '#4f8ef7', background: 'rgba(79,142,247,0.12)', padding: '2px 8px', borderRadius: '10px' } }, topic.weight),
              tp.done && h('span', { style: { fontSize: '11px', color: '#3dd68c', background: 'rgba(61,214,140,0.12)', padding: '2px 8px', borderRadius: '10px' } }, '✓ Done')
            ),
            h('h3', { style: { fontSize: '15px', fontWeight: '600', marginBottom: '6px' } }, topic.title),
            h('p', { style: { fontSize: '12px', color: '#6b748a', marginBottom: '12px', lineHeight: '1.5' } }, topic.description),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('span', { style: { fontSize: '11px', color: '#6b748a' } }, '~' + topic.estimatedHours + 'h'),
              h('span', { style: { fontSize: '12px', color: '#4f8ef7', fontWeight: '600' }, onClick: e => { e.stopPropagation(); setState({ activeTopic: topic, view: 'topic' }); } }, 'Study →')
            )
          );
        })
      ),
      // Floating bar when topics selected
      selCount > 0 && h('div', { style: { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: '#0f1320', border: '1px solid rgba(245,200,66,0.4)', borderRadius: '14px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: '100', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' } },
        h('span', { style: { fontSize: '13px', color: '#f5c842', fontWeight: '600' } }, '⚡ ' + selCount + ' topic' + (selCount > 1 ? 's' : '') + ' selected'),
        h('div', { style: { width: '1px', height: '20px', background: '#1e2535' } }),
        h('button', { style: { background: '#f5c842', color: '#080b12', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
          onClick: () => setState({ quizCert: cert, quizTopics: [...sel], quizView: 'setup', view: 'quiz' })
        }, 'Start Quiz →'),
        h('button', { style: { background: 'transparent', border: 'none', color: '#6b748a', fontSize: '18px', cursor: 'pointer', lineHeight: '1', padding: '0 4px' }, onClick: () => { sel.clear(); setState({}, false); } }, '×')
      )
    ),
    plan.tips?.length > 0 && h('div', { style: { marginBottom: '32px' } },
      h('h2', { class: 'section-title' }, '💡 Exam Tips'),
      ...plan.tips.map((tip, i) => h('div', { class: 'tip-row' },
        h('span', { style: { width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' } }, i + 1),
        tip
      ))
    ),
    // Study plan chat
    h('div', { style: { background: '#0f1320', border: '1px solid #1e2535', borderRadius: '16px', overflow: 'hidden' } },
      h('div', { style: { padding: '14px 18px', borderBottom: '1px solid #1e2535', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('div', {},
          h('span', { style: { fontSize: '14px', fontWeight: '600' } }, '✏️ Edit Study Plan'),
          h('span', { style: { fontSize: '12px', color: '#6b748a', marginLeft: '10px' } }, 'Ask me to add or fix anything')
        ),
        S.dashChat.length > 0 && h('button', { style: { background: 'transparent', border: 'none', color: '#6b748a', fontSize: '12px', cursor: 'pointer' },
          onClick: () => { setState({ dashChat: [], dashChatInput: '' }, true); renderMessages(); } }, 'Clear')
      ),
      chatBox,
      h('div', { style: { display: 'flex', gap: '8px', padding: '10px 14px', borderTop: '1px solid #1e2535', alignItems: 'center' } },
        chatInp,
        h('button', { style: { width: '34px', height: '34px', borderRadius: '8px', background: '#4f8ef7', color: '#fff', border: 'none', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' }, onClick: sendDashChat }, '↑')
      )
    )
  );
}
