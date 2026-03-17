import { S, setState } from '../state.js';
import { h } from '../ui.js';
import { getMsfthubUrl } from '../data.js';
import { toggleTopicDone } from '../plan.js';
import { resBadgeClass } from '../ui.js';

export function renderTopic() {
  const topic = S.activeTopic;
  const prog = S.activeSession?.progress?.[topic.id] || {};
  const hubUrl = getMsfthubUrl(S.activeSession?.cert || '');

  return h('div', { class: 'page' },
    h('button', { class: 'btn-back', onClick: () => setState({ view: 'dashboard' }) }, '← Back to plan'),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '20px', flexWrap: 'wrap' } },
      h('div', {},
        h('div', { style: { fontSize: '12px', color: '#4f8ef7', fontWeight: '700', marginBottom: '6px', letterSpacing: '1px' } }, topic.weight + ' of exam'),
        h('h1', { style: { fontSize: '24px', fontWeight: '700', marginBottom: '8px' } }, topic.title),
        h('p', { style: { color: '#6b748a', fontSize: '14px', maxWidth: '480px' } }, topic.description)
      ),
      h('div', { class: 'flex gap-10', style: { flexWrap: 'wrap', flexShrink: '0' } },
        h('button', { class: prog.done ? 'btn-done' : 'btn-primary', onClick: () => toggleTopicDone(topic.id) }, prog.done ? '✓ Completed' : 'Mark Complete'),
        h('button', { class: 'btn-quiz', onClick: () => setState({ quizCert: S.activeSession?.cert || '', view: 'quiz' }) }, '⚡ Practice Quiz')
      )
    ),
    hubUrl && h('a', { href: hubUrl, target: '_blank', class: 'msfthub-banner' },
      h('span', { style: { fontSize: '20px' } }, '🔗'),
      h('div', {},
        h('div', { style: { fontSize: '13px', fontWeight: '600' } }, 'MSFTHub — ' + (S.activeSession?.cert || '').toUpperCase() + ' Study Materials'),
        h('div', { style: { fontSize: '11px', color: '#6b748a' } }, 'Community-curated resources, labs, videos & practice tests → msfthub.com')
      ),
      h('span', { style: { marginLeft: 'auto', color: '#4f8ef7', fontSize: '14px' } }, '↗')
    ),
    h('div', { class: 'grid-2' },
      h('div', { class: 'card' },
        h('h3', { style: { fontSize: '12px', color: '#6b748a', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '14px', fontWeight: '600' } }, '📋 Subtopics'),
        h('ul', { style: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' } },
          ...(topic.subtopics || []).map(sub => h('li', { style: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' } },
            h('span', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#4f8ef7', flexShrink: '0', display: 'inline-block' } }),
            sub
          ))
        )
      ),
      h('div', { class: 'card' },
        h('h3', { style: { fontSize: '12px', color: '#6b748a', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '14px', fontWeight: '600' } }, '🔗 Study Resources'),
        ...(topic.resources || []).map(r => h('a', { href: r.url, target: '_blank', class: 'resource-link' },
          h('span', { class: resBadgeClass(r.type) }, r.type),
          h('div', { style: { flex: '1' } },
            h('div', { style: { fontSize: '13px', fontWeight: '600', marginBottom: '2px' } }, r.title),
            h('div', { style: { fontSize: '12px', color: '#6b748a' } }, r.description)
          ),
          h('span', { style: { color: '#6b748a', fontSize: '14px' } }, '↗')
        ))
      )
    )
  );
}
