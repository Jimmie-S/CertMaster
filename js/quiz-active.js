import { S, setState } from './state.js';
import { h, frag } from './ui.js';
import { handleStartPlan } from '../plan.js';
import { saveSessions, importSQLite, exportSQLite, saveKey } from './storage.js';

export function renderHome() {
  const totalQ = Object.values(S.questionBank).reduce((s, v) => s + v.length, 0);
  const certCount = Object.keys(S.questionBank).length;

  const fileInput = h('input', { type: 'file', accept: '.db', class: 'hidden' });
  fileInput.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) importSQLite(f); });

  // Settings panel
  const settingsPanel = h('div', { class: 'overlay', style: { display: S.showSettings ? 'flex' : 'none' } },
    h('div', { style: { position: 'absolute', inset: '0' }, onClick: () => setState({ showSettings: false }) }),
    h('div', { class: 'settings-panel', onClick: e => e.stopPropagation() },
      h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } },
        h('h2', { style: { fontSize: '18px', fontWeight: '700' } }, 'Settings'),
        h('button', { style: { background: 'transparent', border: 'none', color: '#6b748a', fontSize: '20px', cursor: 'pointer' }, onClick: () => setState({ showSettings: false }) }, '✕')
      ),
      h('label', { class: 'label', style: { fontSize: '13px', color: '#dde3f0', marginBottom: '10px' } }, '🔑 Anthropic API Key'),
      (() => {
        const ki = h('input', { type: 'password', class: 'input', placeholder: 'sk-ant-api03-…', value: S.tempApiKey, style: { marginBottom: '8px' },
          onInput: e => setState({ tempApiKey: e.target.value }, true) });
        return ki;
      })(),
      h('div', { class: 'flex gap-8', style: { marginBottom: '8px' } },
        h('button', { class: 'btn-primary', style: { flex: '1', padding: '9px 0', fontSize: '13px' }, onClick: async () => { await saveKey(S.tempApiKey); setState({ showSettings: false }); } }, 'Save Key'),
        S.apiKey && h('button', { style: { background: 'rgba(240,106,106,0.1)', border: '1px solid rgba(240,106,106,0.3)', color: '#f06a6a', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', cursor: 'pointer' }, onClick: async () => { await saveKey(''); setState({ tempApiKey: '' }); } }, 'Remove')
      ),
      h('p', { style: { fontSize: '11px', color: '#6b748a', lineHeight: '1.5' } }, S.apiKey ? '✓ Key is set — stored locally, sent only to Anthropic.' : 'Required for all AI features. Get yours at console.anthropic.com'),
      h('div', { class: 'divider' }),
      h('label', { class: 'label', style: { fontSize: '13px', color: '#dde3f0', marginBottom: '12px' } }, '💾 Backup & Restore'),
      h('div', { style: { fontSize: '13px', color: '#6b748a', marginBottom: '14px', lineHeight: '1.6' } },
        h('span', { style: { color: '#dde3f0' } }, S.sessions.length), ' study plan(s) · ',
        h('span', { style: { color: '#dde3f0' } }, totalQ), ' questions across ',
        h('span', { style: { color: '#dde3f0' } }, certCount), ' cert(s)',
        h('br'), h('span', { style: { fontSize: '11px' } }, 'Export saves everything. Import merges without overwriting.')
      ),
      S.bankImportStatus && h('div', { class: 'status-banner', style: { background: S.bankImportStatus.loading ? 'rgba(79,142,247,0.08)' : S.bankImportStatus.success ? 'rgba(61,214,140,0.08)' : 'rgba(240,106,106,0.08)', border: `1px solid ${S.bankImportStatus.loading ? '#4f8ef7' : S.bankImportStatus.success ? '#3dd68c' : '#f06a6a'}`, color: S.bankImportStatus.loading ? '#4f8ef7' : S.bankImportStatus.success ? '#3dd68c' : '#f06a6a' } }, S.bankImportStatus.message),
      h('div', { class: 'flex-col gap-8' },
        h('button', { class: 'btn-secondary', style: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '13px' }, onClick: () => fileInput.click() }, '⬆ Import Backup (.db)'),
        h('button', { class: 'btn-secondary', style: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '13px', opacity: totalQ > 0 ? '1' : '0.4' }, disabled: totalQ === 0, onClick: exportSQLite }, '⬇ Export Full Backup (.db)'),
        h('button', { class: 'btn-secondary', style: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '13px' }, onClick: () => setState({ showSettings: false, view: 'bank' }) }, '⚙ Manage Bank')
      )
    )
  );

  const certInp = h('input', {
    style: { flex: '1', background: 'transparent', border: 'none', color: '#dde3f0', fontSize: '15px', padding: '10px 12px', outline: 'none' },
    placeholder: 'e.g. SC-300, AWS Solutions Architect, CompTIA Security+…',
    value: S.certInput,
    onInput: e => { S.certInput = e.target.value; const btn = e.target.nextElementSibling; if (btn) btn.disabled = !e.target.value.trim(); },
    onKeydown: e => { if (e.key === 'Enter') handleStartPlan(); },
  });

  const chips = ['SC-300', 'AWS Solutions Architect', 'CompTIA Security+', 'Google Cloud ACE', 'PMP', 'CISSP', 'CCNA', 'AZ-900'];

  const sessionsEl = S.sessions.length > 0 && h('div', {},
    h('h2', { class: 'section-title' }, 'Your Certifications'),
    h('div', { class: 'flex-col gap-10' },
      ...S.sessions.map(session => {
        const total = session.plan?.topics?.length || 0;
        const done = Object.values(session.progress || {}).filter(p => p.done).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return h('div', { style: { background: '#0f1320', border: '1px solid #1e2535', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }, onClick: () => setState({ activeSession: session, view: 'dashboard' }) },
          h('div', { style: { flex: '1' } },
            h('div', { style: { fontWeight: '600', fontSize: '16px', marginBottom: '4px' } }, session.cert),
            h('div', { style: { fontSize: '12px', color: '#6b748a', marginBottom: '8px' } }, `${done}/${total} topics complete`),
            h('div', { class: 'flex', style: { alignItems: 'center', gap: '8px' } },
              h('div', { class: 'progress-bar-wrap' }, h('div', { class: 'progress-bar', style: { width: pct + '%' } })),
              h('span', { style: { fontSize: '12px', color: '#4f8ef7', fontWeight: '600', minWidth: '32px' } }, pct + '%')
            )
          ),
          h('div', { class: 'flex gap-8', style: { marginLeft: '16px' } },
            h('button', { class: 'btn-secondary', style: { padding: '8px 14px', fontSize: '13px' }, onClick: e => { e.stopPropagation(); setState({ quizCert: session.cert, quizView: 'setup', view: 'quiz' }); } }, '⚡ Quiz'),
            h('button', { style: { background: 'transparent', border: 'none', color: '#6b748a', cursor: 'pointer', fontSize: '16px', padding: '4px 6px' },
              onClick: e => { e.stopPropagation(); saveSessions(S.sessions.filter(s => s.id !== session.id)); }
            }, '✕')
          )
        );
      })
    )
  );

  const emptyEl = S.sessions.length === 0 && h('div', { style: { textAlign: 'center', paddingTop: '32px' } },
    h('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '🎓'),
    h('p', { style: { color: '#6b748a', fontSize: '15px', marginBottom: '20px' } }, 'Type a certification above to get started.'),
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' } },
      ...chips.map(cert => h('button', {
        style: { padding: '7px 14px', background: '#0f1320', border: '1px solid #1e2535', borderRadius: '20px', color: '#dde3f0', fontSize: '13px', cursor: 'pointer' },
        onClick: () => { setState({ certInput: cert }, true); certInp.value = cert; },
      }, cert))
    )
  );

  return frag(
    fileInput,
    settingsPanel,
    h('div', { class: 'page' },
      h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' } },
        h('div', { class: 'flex', style: { alignItems: 'center', gap: '10px' } },
          h('span', { style: { fontSize: '24px', color: '#4f8ef7' } }, '◈'),
          h('span', { style: { fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px' } }, 'CertPrep AI')
        ),
        h('button', { class: 'gear-btn', title: 'Settings', onClick: () => setState({ tempApiKey: S.apiKey, showSettings: true }) },
          h('svg', { width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: S.apiKey ? '#4f8ef7' : '#6b748a', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' }),
          !S.apiKey && h('span', { class: 'key-dot' })
        )
      ),
      h('div', { style: { textAlign: 'center', marginBottom: '32px' } },
        h('p', { style: { color: '#6b748a', fontSize: '15px', maxWidth: '480px', margin: '0 auto' } }, 'Enter any certification — get an AI study plan, resources, and practice quizzes.')
      ),
      h('div', { style: { display: 'flex', gap: '10px', marginBottom: '12px', background: '#0f1320', border: '1px solid #1e2535', borderRadius: '14px', padding: '8px' } },
        certInp,
        h('button', { class: 'btn-primary', style: { width: 'auto', padding: '11px 22px', whiteSpace: 'nowrap', opacity: S.certInput.trim() ? '1' : '0.5' }, disabled: !S.certInput.trim(), onClick: handleStartPlan }, 'Build Study Plan →')
      ),
      h('div', { style: { textAlign: 'center', marginBottom: '36px' } },
        h('span', { style: { color: '#6b748a', fontSize: '13px' } }, 'or '),
        h('button', { style: { background: 'transparent', border: 'none', color: '#4f8ef7', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }, onClick: () => setState({ quizView: 'setup', view: 'quiz' }) }, 'go straight to quiz generator →')
      ),
      sessionsEl || '',
      emptyEl || ''
    )
  );
}
