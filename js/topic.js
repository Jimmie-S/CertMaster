import { S, setState } from '../state.js';
import { h, frag } from './ui.js';
import { calcScore, isCorrectAnswer, hasAnsweredQ } from '../quiz.js';

export function renderQuizReview() {
  return h('div', { class: 'page' },
    h('div', { class: 'flex', style: { justifyContent: 'space-between', marginBottom: '20px' } },
      h('button', { class: 'btn-back', style: { padding: '0' }, onClick: () => setState({ quizView: 'results' }) }, '← Back to Results'),
      h('span', { style: { color: '#6b748a', fontSize: '13px' } }, calcScore() + '/' + S.questions.length + ' correct')
    ),
    ...S.questions.map((q, idx) => {
      const correct = isCorrectAnswer(q, S.userAnswers[q.id]);
      const wrong = hasAnsweredQ(q, S.userAnswers[q.id]) && !correct;
      return h('div', { class: 'card review-card', style: { borderColor: correct ? 'rgba(61,214,140,0.3)' : wrong ? 'rgba(240,106,106,0.3)' : '#1e2535' } },
        h('div', { class: 'flex', style: { justifyContent: 'space-between', marginBottom: '10px' } },
          h('span', { style: { color: '#4f8ef7', fontSize: '13px', fontWeight: '600' } }, 'Q' + (idx + 1)),
          h('span', { style: { fontSize: '12px', padding: '2px 10px', borderRadius: '20px', background: correct ? 'rgba(61,214,140,0.12)' : wrong ? 'rgba(240,106,106,0.12)' : 'rgba(245,200,66,0.12)', color: correct ? '#3dd68c' : wrong ? '#f06a6a' : '#f5c842' } }, correct ? '✓ Correct' : wrong ? '✗ Wrong' : 'Skipped')
        ),
        h('p', { style: { fontWeight: '600', fontSize: '14px', marginBottom: '12px' } }, q.question),

        // MCQ review
        (!q.type || q.type === 'mcq') && frag(...(q.options || []).map((opt, i) => {
          const letter = ['A', 'B', 'C', 'D', 'E'][i];
          const isCor = letter === q.correctAnswer;
          const isSel = S.userAnswers[q.id] === letter && !isCor;
          return h('div', { style: { padding: '8px 12px', borderRadius: '8px', marginBottom: '6px', background: isCor ? 'rgba(61,214,140,0.1)' : isSel ? 'rgba(240,106,106,0.1)' : 'transparent', border: `1px solid ${isCor ? 'rgba(61,214,140,0.4)' : isSel ? 'rgba(240,106,106,0.4)' : '#1e2535'}`, fontSize: '13px', color: isCor ? '#3dd68c' : isSel ? '#f06a6a' : '#6b748a' } }, opt, ' ', isCor ? '✓' : isSel ? '✗' : '');
        })),

        // Multi review
        q.type === 'multi' && frag(...(q.options || []).map((opt, i) => {
          const letter = ['A', 'B', 'C', 'D', 'E'][i];
          const isCor = (q.correctAnswers || []).includes(letter);
          const isSel = (S.userAnswers[q.id]?.selected || []).includes(letter);
          return h('div', { style: { padding: '8px 12px', borderRadius: '8px', marginBottom: '6px', display: 'flex', gap: '8px', alignItems: 'center', background: isCor ? 'rgba(61,214,140,0.1)' : isSel && !isCor ? 'rgba(240,106,106,0.1)' : 'transparent', border: `1px solid ${isCor ? 'rgba(61,214,140,0.4)' : isSel && !isCor ? 'rgba(240,106,106,0.4)' : '#1e2535'}`, fontSize: '13px', color: isCor ? '#3dd68c' : isSel && !isCor ? '#f06a6a' : '#6b748a' } },
            h('span', { style: { fontWeight: '700', minWidth: '20px' } }, letter + ')'), opt, ' ', isCor ? '✓ correct' : isSel && !isCor ? '✗ wrong' : '');
        })),

        // Case study review
        q.type === 'casestudy' && (() => {
          const ans = S.userAnswers[q.id] || { sub: {} };
          return h('div', {},
            h('div', { style: { fontSize: '13px', fontWeight: '600', color: '#34d399', marginBottom: '10px' } }, q.title || 'Case Study'),
            ...(q.questions || []).map((sq, i) => {
              const sqAns = ans.sub && ans.sub[sq.subId];
              const sqCorrect = sqAns === sq.correctAnswer;
              return h('div', { style: { marginBottom: '12px', paddingLeft: '12px', borderLeft: '2px solid ' + (sqCorrect ? 'rgba(61,214,140,0.4)' : 'rgba(240,106,106,0.4)') } },
                h('div', { style: { fontSize: '12px', color: sqCorrect ? '#3dd68c' : '#f06a6a', fontWeight: '600', marginBottom: '4px' } }, 'Q' + String.fromCharCode(65 + i) + ': ' + (sqCorrect ? '✓ Correct' : '✗ Wrong') + ' (your: ' + (sqAns || '–') + ', correct: ' + sq.correctAnswer + ')'),
                h('div', { style: { fontSize: '13px', color: '#dde3f0', marginBottom: '4px' } }, sq.question),
                h('div', { style: { fontSize: '12px', color: '#6b748a', lineHeight: '1.5' } }, sq.explanation)
              );
            })
          );
        })() || '',

        // Order review
        q.type === 'order' && (() => {
          const userOrder = S.userAnswers[q.id]?.orderedSteps || [];
          const corOrder = q.correctOrder || [];
          return h('div', {},
            h('div', { style: { fontSize: '12px', color: '#6b748a', marginBottom: '8px' } }, 'Your order:'),
            ...userOrder.map((origIdx, pos) => {
              const isRight = userOrder[pos] === corOrder[pos];
              return h('div', { style: { padding: '7px 12px', borderRadius: '7px', marginBottom: '5px', fontSize: '13px', display: 'flex', gap: '10px', alignItems: 'center', background: isRight ? 'rgba(61,214,140,0.08)' : 'rgba(240,106,106,0.08)', border: `1px solid ${isRight ? 'rgba(61,214,140,0.3)' : 'rgba(240,106,106,0.3)'}`, color: isRight ? '#3dd68c' : '#f06a6a' } },
                h('span', { style: { fontWeight: '700', minWidth: '18px', flexShrink: '0' } }, pos + 1 + '.'),
                (q.steps || [])[origIdx], ' ', isRight ? '✓' : '✗'
              );
            }),
            !correct && h('div', { style: { marginTop: '8px', fontSize: '12px', color: '#6b748a' } }, 'Correct: ' + (corOrder || []).map((i, pos) => (pos + 1) + '. ' + (q.steps || [])[i]).join(' → '))
          );
        })() || '',

        h('div', { style: { background: '#080b12', borderRadius: '8px', padding: '10px 12px', marginTop: '8px', fontSize: '12px', color: '#6b748a', lineHeight: '1.6' } },
          h('strong', { style: { color: '#dde3f0' } }, 'Explanation: '), q.explanation
        ),
        q.sourceUrl && h('a', { href: q.sourceUrl, target: '_blank', style: { color: '#4f8ef7', fontSize: '12px', display: 'inline-block', marginTop: '6px' } }, '📎 ' + (q.sourceName || 'Source') + ' ↗')
      );
    })
  );
}
