import { S, setState } from './state.js';
import { h } from './ui.js';
import { calcScore, calcScaledScore, calcDomainScores, isCorrectAnswer, hasAnsweredQ } from './quiz.js';

export function renderQuizResults() {
  const score = calcScore();
  const scaledScore = calcScaledScore();
  const domainScores = calcDomainScores();
  const passed = scaledScore >= 700;
  const wrongQs = S.questions.filter(q => hasAnsweredQ(q, S.userAnswers[q.id]) && !isCorrectAnswer(q, S.userAnswers[q.id]));
  const cert = S.quizCert || S.activeSession?.cert || '';
  const passLinePct = 70; // 700/1000

  // Domain rows sorted by % ascending (weakest first)
  const domainEntries = Object.entries(domainScores)
    .map(([name, { correct, total }]) => ({ name, correct, total, pct: total ? Math.round((correct / total) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct);

  function domainBarColor(pct) {
    if (pct >= 70) return '#3dd68c';
    if (pct >= 50) return '#f5c842';
    return '#f06a6a';
  }

  return h('div', { class: 'page', style: { maxWidth: '700px' } },
    h('button', { class: 'btn-back', onClick: () => setState({ quizView: 'setup' }) }, '← New Quiz'),

    // ── Score card ──
    h('div', { class: 'card', style: { padding: '36px 36px 28px', marginBottom: '16px' } },

      // Cert name + mode
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' } },
        h('div', {},
          h('div', { style: { fontSize: '12px', color: '#6b748a', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px', fontWeight: '600' } }, 'Exam Result'),
          h('div', { style: { fontSize: '18px', fontWeight: '700' } }, cert.toUpperCase())
        ),
        h('span', { style: { fontSize: '11px', background: '#0f1320', border: '1px solid #1e2535', color: '#6b748a', borderRadius: '6px', padding: '4px 10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' } }, S.quizMode)
      ),

      // Verdict badge + scaled score
      h('div', { style: { textAlign: 'center', marginBottom: '8px' } },
        h('div', { class: 'verdict-badge ' + (passed ? 'pass' : 'fail') },
          passed ? '✓ PASSED' : '✗ FAILED'
        )
      ),
      h('div', { class: 'score-display' },
        h('div', { class: 'score-number ' + (passed ? 'pass' : 'fail') }, scaledScore),
        h('div', { class: 'score-denom' }, '/ 1000')
      ),

      // Score bar with passing line
      h('div', { style: { position: 'relative' } },
        h('div', { class: 'score-bar-track' },
          h('div', { class: 'score-bar-fill ' + (passed ? 'pass' : 'fail'), style: { width: (scaledScore / 10) + '%' } }),
          // Passing score line at 700/1000 = 70%
          h('div', { class: 'score-pass-line', style: { left: passLinePct + '%' } },
            h('span', { class: 'score-pass-label' }, '700')
          )
        ),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b748a', marginTop: '4px' } },
          h('span', {}, '0'),
          h('span', { style: { color: '#f5c842' } }, 'Passing: 700'),
          h('span', {}, '1000')
        )
      ),

      // Raw stats
      h('div', { style: { display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #1e2535' } },
        h('div', { style: { textAlign: 'center' } },
          h('div', { style: { fontSize: '22px', fontWeight: '700', color: '#dde3f0' } }, score + '/' + S.questions.length),
          h('div', { style: { fontSize: '11px', color: '#6b748a', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Correct')
        ),
        h('div', { style: { textAlign: 'center' } },
          h('div', { style: { fontSize: '22px', fontWeight: '700', color: wrongQs.length > 0 ? '#f06a6a' : '#3dd68c' } }, wrongQs.length),
          h('div', { style: { fontSize: '11px', color: '#6b748a', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Wrong')
        ),
        h('div', { style: { textAlign: 'center' } },
          h('div', { style: { fontSize: '22px', fontWeight: '700', color: '#dde3f0' } }, S.questions.length - score - wrongQs.length),
          h('div', { style: { fontSize: '11px', color: '#6b748a', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Skipped')
        )
      )
    ),

    // ── Section performance ──
    domainEntries.length > 0 && h('div', { class: 'card', style: { marginBottom: '16px' } },
      h('div', { style: { fontSize: '12px', color: '#6b748a', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '600', marginBottom: '18px' } }, 'Section Performance'),
      ...domainEntries.map(({ name, correct, total, pct }) => {
        const color = domainBarColor(pct);
        return h('div', { class: 'domain-row' },
          h('div', { class: 'domain-header' },
            h('span', { style: { color: '#dde3f0', fontWeight: '500' } }, name),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
              h('span', { style: { fontSize: '11px', color: '#6b748a' } }, correct + '/' + total),
              h('span', { style: { fontWeight: '700', color, minWidth: '36px', textAlign: 'right' } }, pct + '%'),
              pct < 70 && h('span', { style: { fontSize: '10px', color: '#f5c842', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: '4px', padding: '1px 6px' } }, 'Needs work')
            )
          ),
          h('div', { class: 'domain-bar-track' },
            h('div', { class: 'domain-bar-fill', style: { width: pct + '%', background: color } })
          )
        );
      })
    ),

    // ── Actions ──
    h('div', { class: 'card', style: { padding: '20px' } },
      h('div', { class: 'flex gap-10', style: { flexWrap: 'wrap' } },
        h('button', { class: 'btn-primary', onClick: () => setState({ questions: [], userAnswers: {}, currentQ: 0, quizView: 'setup' }) }, 'New Quiz'),
        wrongQs.length > 0 && h('button', { class: 'btn-quiz', onClick: () => {
          const retake = wrongQs.map((q, i) => ({ ...q, id: i + 1 }));
          setState({ questions: retake, userAnswers: {}, currentQ: 0, quizView: 'active' });
        } }, '🔁 Retry Wrong (' + wrongQs.length + ')'),
        h('button', { class: 'btn-secondary', onClick: () => setState({ quizView: 'review' }) }, 'Review Answers'),
        S.activeSession && h('button', { class: 'btn-secondary', onClick: () => setState({ view: 'dashboard' }) }, 'Back to Plan')
      )
    )
  );
}
