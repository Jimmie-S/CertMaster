import { S, setState } from '../state.js';
import { h, frag } from '../ui.js';
import { importSQLite, exportSQLite, saveBank } from '../storage.js';

function renderSparkline(results) {
  const recent = [...results].sort((a, b) => a.id - b.id).slice(-10);
  if (recent.length < 2) return null;
  const scores = recent.map(r => r.pct);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const W = 80, H = 30, PAD = 3;
  const pts = scores.map((s, i) => {
    const x = PAD + (i / (scores.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((s - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const first = scores[0], last = scores[scores.length - 1];
  const stroke = last > first ? '#3dd68c' : last < first ? '#f06a6a' : '#4f8ef7';
  return h('svg', { width: W, height: H, class: 'sparkline', viewBox: `0 0 ${W} ${H}` },
    h('polyline', { points: pts, fill: 'none', stroke, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
  );
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function renderBank() {
  const totalQ = Object.values(S.questionBank).reduce((s, v) => s + v.length, 0);
  const hasData = totalQ > 0 || S.sessions.length > 0 || S.quizResults.length > 0;

  const fileInput = h('input', { type: 'file', accept: '.db', class: 'hidden' });
  fileInput.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) importSQLite(f); });

  // Group results by cert
  const resultsByCert = {};
  for (const r of S.quizResults) {
    if (!resultsByCert[r.cert]) resultsByCert[r.cert] = [];
    resultsByCert[r.cert].push(r);
  }

  return frag(
    fileInput,
    h('div', { class: 'page' },
      h('button', { class: 'btn-back', onClick: () => setState({ view: 'quiz' }) }, '← Back to Quiz'),

      h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' } },
        h('div', {},
          h('h1', { style: { fontSize: '24px', fontWeight: '700', marginBottom: '4px' } }, '📦 Data & History'),
          h('p', { style: { color: '#6b748a', fontSize: '14px' } }, S.sessions.length + ' study plan(s) · ' + totalQ + ' questions · ' + S.quizResults.length + ' quiz result(s)')
        ),
        h('div', { class: 'flex gap-10', style: { flexWrap: 'wrap' } },
          h('button', { class: 'btn-secondary', onClick: () => fileInput.click() }, '⬆ Import Backup (.db)'),
          h('button', { class: 'btn-primary', style: { opacity: hasData ? '1' : '0.4' }, disabled: !hasData, onClick: exportSQLite }, '⬇ Export Full Backup (.db)')
        )
      ),

      S.bankImportStatus && h('div', { class: 'status-banner', style: { background: S.bankImportStatus.loading ? 'rgba(79,142,247,0.08)' : S.bankImportStatus.success ? 'rgba(61,214,140,0.08)' : 'rgba(240,106,106,0.08)', border: `1px solid ${S.bankImportStatus.loading ? '#4f8ef7' : S.bankImportStatus.success ? '#3dd68c' : '#f06a6a'}`, color: S.bankImportStatus.loading ? '#4f8ef7' : S.bankImportStatus.success ? '#3dd68c' : '#f06a6a', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('span', {}, S.bankImportStatus.message),
        !S.bankImportStatus.loading && h('button', { style: { background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }, onClick: () => setState({ bankImportStatus: null }) }, '✕')
      ),

      // ── Quiz Results History ──
      h('h2', { class: 'section-title', style: { marginBottom: '14px' } }, '🏆 Quiz Results History'),
      S.quizResults.length === 0
        ? h('div', { class: 'card', style: { textAlign: 'center', padding: '32px', marginBottom: '24px' } },
            h('div', { style: { fontSize: '36px', marginBottom: '10px' } }, '📝'),
            h('p', { style: { color: '#6b748a', fontSize: '14px' } }, 'No quiz results yet. Complete a quiz to see your history here.')
          )
        : h('div', { style: { marginBottom: '32px' } },
            ...Object.entries(resultsByCert).map(([cert, results]) => {
              const hasScaled = results.some(r => r.scaledScore != null);
              const avgScaled = hasScaled ? Math.round(results.reduce((s, r) => s + (r.scaledScore ?? r.pct * 10), 0) / results.length) : null;
              const bestScaled = hasScaled ? Math.max(...results.map(r => r.scaledScore ?? r.pct * 10)) : null;
              const avg = Math.round(results.reduce((s, r) => s + r.pct, 0) / results.length);
              const best = Math.max(...results.map(r => r.pct));
              const passed = results.filter(r => (r.scaledScore ?? r.pct * 10) >= 700).length;
              const avgLabel = hasScaled ? `avg ${avgScaled}/1000` : `avg ${avg}%`;
              const bestLabel = hasScaled ? `best ${bestScaled}/1000` : `best ${best}%`;
              const sparkline = renderSparkline(results);
              return h('div', { class: 'card', style: { marginBottom: '12px' } },
                h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' } },
                  h('div', { style: { flex: '1' } },
                    h('div', { style: { fontWeight: '600', fontSize: '16px', marginBottom: '2px' } }, cert.toUpperCase()),
                    h('div', { style: { fontSize: '12px', color: '#6b748a' } }, results.length + ' attempt(s) · ' + avgLabel + ' · ' + bestLabel + ' · ' + passed + '/' + results.length + ' passed')
                  ),
                  h('div', { class: 'flex', style: { alignItems: 'center', gap: '12px', flexShrink: '0' } },
                    sparkline && h('div', { class: 'sparkline-wrap' }, sparkline),
                    h('button', { class: 'btn-secondary', style: { padding: '6px 14px', fontSize: '12px' }, onClick: () => setState({ quizCert: cert, quizView: 'setup', view: 'quiz' }) }, 'Quiz Again')
                  )
                ),
                h('div', { class: 'flex-col', style: { gap: '6px' } },
                  ...results.slice(0, 5).map(r => {
                    const p = (r.scaledScore ?? r.pct * 10) >= 700;
                    const scoreLabel = r.scaledScore != null ? r.scaledScore : r.pct + '%';
                    const scoreSuffix = r.scaledScore != null ? '/1000' : '';
                    return h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: '#080b12', borderRadius: '8px', fontSize: '13px' } },
                      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: '0' } },
                        h('span', { style: { minWidth: '42px', height: '22px', borderRadius: '6px', background: p ? 'rgba(61,214,140,0.12)' : 'rgba(240,106,106,0.12)', color: p ? '#3dd68c' : '#f06a6a', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' } }, scoreLabel),
                        scoreSuffix && h('span', { style: { fontSize: '10px', color: '#6b748a' } }, scoreSuffix)
                      ),
                      h('span', { style: { color: '#dde3f0', flexShrink: '0' } }, r.score + '/' + r.total + ' correct'),
                      h('span', { style: { color: '#6b748a', fontSize: '11px', background: '#0f1320', padding: '2px 7px', borderRadius: '5px', flexShrink: '0' } }, r.mode || 'training'),
                      h('span', { style: { color: '#6b748a', fontSize: '11px', marginLeft: 'auto', flexShrink: '0' } }, formatDate(r.date))
                    );
                  }),
                  results.length > 5 && h('div', { style: { fontSize: '11px', color: '#6b748a', padding: '4px 12px' } }, `+${results.length - 5} older results`)
                )
              );
            })
          ),

      // ── Question Bank ──
      h('h2', { class: 'section-title', style: { marginBottom: '14px' } }, '📚 Question Bank'),
      Object.keys(S.questionBank).length === 0
        ? h('div', { class: 'card', style: { textAlign: 'center', padding: '32px', marginBottom: '24px' } },
            h('div', { style: { fontSize: '36px', marginBottom: '10px' } }, '📭'),
            h('p', { style: { color: '#6b748a' } }, 'No questions saved yet. Generate a quiz to start building your bank.')
          )
        : h('div', { class: 'flex-col gap-10', style: { marginBottom: '24px' } },
            ...Object.entries(S.questionBank).map(([certKey, qs]) => {
              const stats = S.questionStats[certKey] || {};
              const totalSeen = Object.keys(stats).length;
              const totalWrong = Object.values(stats).reduce((s, v) => s + v.wrong, 0);
              return h('div', { class: 'card' },
                h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
                  h('div', {},
                    h('div', { style: { fontWeight: '600', fontSize: '16px', textTransform: 'capitalize' } }, certKey),
                    h('div', { style: { fontSize: '12px', color: '#6b748a', marginTop: '2px' } }, qs.length + ' questions saved' + (totalSeen > 0 ? ` · ${totalSeen} practiced · ${totalWrong} wrong answers tracked` : ''))
                  ),
                  h('div', { class: 'flex gap-8' },
                    h('button', { class: 'btn-secondary', style: { padding: '6px 14px', fontSize: '12px' }, onClick: () => setState({ quizCert: certKey, quizSource: 'saved', quizView: 'setup', view: 'quiz' }) }, 'Use in Quiz'),
                    h('button', { style: { background: 'rgba(240,106,106,0.1)', border: '1px solid rgba(240,106,106,0.3)', color: '#f06a6a', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }, onClick: () => { const u = { ...S.questionBank }; delete u[certKey]; saveBank(u); } }, 'Delete')
                  )
                ),
                h('div', { class: 'flex-col gap-8' },
                  ...qs.slice(0, 3).map((q, i) => h('div', { style: { background: '#080b12', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#6b748a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                    h('span', { style: { color: '#4f8ef7', marginRight: '8px' } }, 'Q' + (i + 1)), q.question)),
                  qs.length > 3 && h('div', { style: { fontSize: '11px', color: '#6b748a', paddingLeft: '4px' } }, `+${qs.length - 3} more questions…`)
                )
              );
            })
          ),

      h('div', { style: { padding: '16px 20px', background: 'rgba(79,142,247,0.04)', border: '1px solid #1e2535', borderRadius: '12px', fontSize: '12px', color: '#6b748a', lineHeight: '1.7' } },
        h('strong', { style: { color: '#dde3f0' } }, 'About backups'), h('br'),
        'Export saves everything: study plans, questions, and quiz results as a single .db SQLite file. Import merges without overwriting existing data.'
      )
    )
  );
}
