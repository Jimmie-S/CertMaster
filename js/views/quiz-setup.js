import { S, setState } from '../state.js';
import { h, frag } from '../ui.js';
import { getBankQuestions } from '../bank.js';
import { startQuiz } from '../quiz.js';

export function renderQuizSetup() {
  const saved = getBankQuestions(S.quizCert || S.activeSession?.cert || '');

  const certInp = h('input', { class: 'input', placeholder: 'e.g. SC-300, AWS SAA, CompTIA Security+…', value: S.quizCert,
    onInput: e => { S.quizCert = e.target.value; },
    onKeydown: e => { if (e.key === 'Enter') startQuiz(); } });

  return h('div', { class: 'page' },
    h('button', { class: 'btn-back', onClick: () => setState({ view: S.activeSession ? 'dashboard' : 'home' }) }, '← Back'),
    h('h1', { style: { fontSize: '26px', fontWeight: '700', marginBottom: '6px' } }, 'Practice Quiz'),
    h('p', { style: { color: '#6b748a', fontSize: '14px', marginBottom: '28px' } }, 'Generate AI-powered exam questions for any certification.'),
    h('div', { class: 'card' },
      !S.apiKey && h('div', { style: { background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#f5c842', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('span', {}, '⚠️ API key required for AI features'),
        h('button', { style: { background: 'rgba(245,200,66,0.15)', border: '1px solid rgba(245,200,66,0.4)', color: '#f5c842', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }, onClick: () => setState({ tempApiKey: '', showApiModal: true }) }, 'Add Key')
      ),
      h('div', { style: { marginBottom: '18px' } },
        h('label', { class: 'label' }, 'Certification'),
        certInp
      ),
      // Topic focus indicator
      S.quizTopics.length > 0 && h('div', { style: { marginBottom: '18px' } },
        h('div', { style: { background: 'rgba(245,200,66,0.06)', border: '1px solid rgba(245,200,66,0.25)', borderRadius: '10px', padding: '10px 14px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
            h('span', { style: { fontSize: '12px', color: '#f5c842', fontWeight: '600' } }, '⚡ Topic focus'),
            h('button', { style: { background: 'transparent', border: 'none', color: '#6b748a', fontSize: '12px', cursor: 'pointer' }, onClick: () => setState({ quizTopics: [] }) }, '× Clear')
          ),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
            ...S.quizTopics.map(t => h('span', { style: { fontSize: '12px', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', color: '#f5c842', padding: '3px 10px', borderRadius: '20px' } }, t))
          ),
          h('p', { style: { fontSize: '11px', color: '#6b748a', marginTop: '8px', marginBottom: '0' } }, 'Questions will focus on ' + S.quizTopics.length + ' selected topic(s). Clear to generate from the full cert.')
        )
      ),
      // Question count slider
      h('div', { style: { marginBottom: '18px' } },
        h('div', { class: 'flex', style: { justifyContent: 'space-between', marginBottom: '8px' } },
          h('label', { class: 'label', style: { margin: '0' } }, 'Questions'),
          h('span', { style: { color: '#4f8ef7', fontWeight: '700', fontSize: '18px' } }, S.quizCount)
        ),
        h('input', { type: 'range', min: '5', max: '100', value: S.quizCount, style: { width: '100%' }, onInput: e => setState({ quizCount: parseInt(e.target.value) }) }),
        h('div', { style: { position: 'relative', height: '16px', marginTop: '4px' } },
          ...[5, 25, 50, 75, 100].map(n => {
            const pct = (n - 5) / (100 - 5) * 100;
            return h('span', { style: { position: 'absolute', left: pct + '%', transform: 'translateX(-50%)', fontSize: '11px', color: '#6b748a' } }, n);
          })
        )
      ),
      h('div', { class: 'grid-2', style: { marginBottom: '18px' } },
        h('div', {},
          h('label', { class: 'label' }, 'Mode'),
          h('div', { class: 'flex gap-8' },
            ...['training', 'exam'].map(m => h('button', { class: 'seg-btn' + (S.quizMode === m ? ' active' : ''), onClick: () => setState({ quizMode: m }) }, m === 'training' ? '📖 Training' : '📝 Exam'))
          )
        ),
        h('div', {},
          h('label', { class: 'label' }, 'Source'),
          h('div', { class: 'flex gap-8' },
            ...['new', 'mixed', 'saved'].map(src => h('button', { class: 'seg-btn' + (S.quizSource === src ? ' active' : ''), onClick: () => setState({ quizSource: src }) }, src))
          )
        )
      ),
      // Exam duration (only shown in exam mode)
      S.quizMode === 'exam' && h('div', { style: { marginBottom: '18px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '10px', padding: '14px 16px' } },
        h('div', { class: 'flex', style: { justifyContent: 'space-between', marginBottom: '8px' } },
          h('label', { class: 'label', style: { margin: '0', color: '#4f8ef7' } }, '⏱ Exam Duration'),
          h('span', { style: { color: '#4f8ef7', fontWeight: '700', fontSize: '16px' } }, S.examDuration + ' min')
        ),
        h('input', { type: 'range', min: '30', max: '180', step: '15', value: S.examDuration, style: { width: '100%' }, onInput: e => setState({ examDuration: parseInt(e.target.value) }) }),
        h('div', { style: { position: 'relative', height: '16px', marginTop: '4px' } },
          ...[30, 60, 90, 120, 150, 180].map(n => {
            const pct = (n - 30) / (180 - 30) * 100;
            return h('span', { style: { position: 'absolute', left: pct + '%', transform: 'translateX(-50%)', fontSize: '10px', color: '#6b748a' } }, n);
          })
        ),
        h('p', { style: { fontSize: '11px', color: '#6b748a', marginTop: '8px', marginBottom: '0' } }, 'Timer starts when the quiz begins. Unanswered questions are marked wrong when time runs out.')
      ),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px', fontSize: '14px' } },
        h('input', { type: 'checkbox', checked: S.quizFocusRecent ? 'checked' : null, onChange: e => setState({ quizFocusRecent: e.target.checked }) }),
        h('span', { style: { color: '#6b748a' } }, 'Focus on recent updates (2024–2025)')
      ),
      h('div', { style: { background: 'rgba(79,142,247,0.06)', border: '1px solid #1e2535', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('div', {},
          h('span', { style: { color: '#6b748a' } }, '📦 Question bank: '),
          Object.keys(S.questionBank).length === 0
            ? h('span', { style: { color: '#6b748a' } }, 'empty')
            : frag(...Object.entries(S.questionBank).map(([k, v]) =>
                h('span', { style: { marginRight: '12px' } }, h('span', { style: { color: '#dde3f0' } }, k), h('span', { style: { color: '#6b748a' } }, ` (${v.length})`))
              ))
        ),
        h('button', { style: { background: 'rgba(79,142,247,0.15)', border: '1px solid #4f8ef7', color: '#4f8ef7', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', flexShrink: '0' }, onClick: () => setState({ view: 'bank' }) }, 'Manage →')
      ),
      S.quizError && h('p', { style: { color: '#f06a6a', fontSize: '13px', marginBottom: '12px' } }, S.quizError),
      h('button', { class: 'btn-primary', style: { width: '100%' }, onClick: startQuiz }, 'Generate Quiz →')
    )
  );
}
