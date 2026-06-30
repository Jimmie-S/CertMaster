import { S, setState } from './state.js';
import { h } from './ui.js';
import { handleAnswer, submitMulti, submitOrder, isCorrectAnswer, hasAnsweredQ, calcScore, finishQuiz, clearExamTimer, formatTimer } from './quiz.js';

export function renderQuizActive() {
  if (S.quizLoading && S.questions.length === 0) return h('div', { class: 'center' },
    h('div', { style: { textAlign: 'center', padding: '40px' } },
      h('div', { class: 'gen-spinner' }),
      h('h2', { style: { fontSize: '22px', fontWeight: '700', marginBottom: '10px' } }, 'Generating questions…'),
      h('p', { style: { color: '#6b748a', fontSize: '13px' } }, 'First batch in ~10 seconds')
    )
  );

  const cq = S.questions[S.currentQ];
  if (!cq) return null;

  const hasAnswered = hasAnsweredQ(cq, S.userAnswers[cq.id]);
  const showFeedback = hasAnswered && S.quizMode === 'training';
  const isCorrect = isCorrectAnswer(cq, S.userAnswers[cq.id]);
  const allAnswered = S.questions.every(q => hasAnsweredQ(q, S.userAnswers[q.id]));

  // Timer element (exam mode only — updated directly by interval without re-render)
  const timerEl = S.quizMode === 'exam'
    ? h('div', { id: 'exam-timer', class: 'exam-timer-badge' },
        '⏱ ' + formatTimer(S.examTimeLeft)
      )
    : null;

  // Apply warning/critical classes after render based on current time
  if (timerEl && S.examTimeLeft < 60) timerEl.classList.add('critical');
  else if (timerEl && S.examTimeLeft < 300) timerEl.classList.add('warning');

  return h('div', { class: 'page' },
    timerEl,
    h('div', { class: 'flex', style: { justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
      h('button', { class: 'btn-back', style: { padding: '0' }, onClick: () => { clearExamTimer(); S._abort?.abort(); setState({ quizView: 'setup' }); } }, '← Exit'),
      h('div', { class: 'flex gap-12', style: { alignItems: 'center' } },
        S.quizLoadingMore && h('span', { style: { fontSize: '12px', color: '#4f8ef7' } }, '⟳ Loading more…'),
        S.saveNote && h('span', { style: { fontSize: '12px', color: '#3dd68c' } }, S.saveNote),
        allAnswered && h('button', { class: 'btn-primary', onClick: finishQuiz }, 'See Results →')
      )
    ),
    h('div', { class: 'quiz-card' },
      h('div', { class: 'flex', style: { justifyContent: 'space-between', marginBottom: '10px' } },
        h('span', { style: { fontSize: '12px', color: '#4f8ef7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' } }, S.quizCert || S.activeSession?.cert),
        h('span', { style: { fontSize: '12px', color: '#6b748a' } }, (S.currentQ + 1) + '/' + S.questions.length + (S.quizLoadingMore ? ' (loading more)' : ''))
      ),
      h('div', { style: { height: '4px', background: '#1e2535', borderRadius: '4px', overflow: 'hidden', marginBottom: '24px' } },
        h('div', { class: 'progress-bar', style: { width: (S.currentQ / S.questions.length * 100) + '%', transition: 'width .4s' } })
      ),
      // Question type badge
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } },
        cq.type === 'multi' && h('span', { style: { fontSize: '11px', fontWeight: '700', color: '#f5c842', background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: '6px', padding: '3px 9px' } }, 'SELECT ALL THAT APPLY'),
        cq.type === 'order' && h('span', { style: { fontSize: '11px', fontWeight: '700', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '6px', padding: '3px 9px' } }, 'DRAG TO ORDER'),
        cq.type === 'casestudy' && h('span', { style: { fontSize: '11px', fontWeight: '700', color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', padding: '3px 9px' } }, '📋 CASE STUDY'),
        (!cq.type || cq.type === 'mcq') && h('span', { style: { fontSize: '11px', fontWeight: '700', color: '#6b748a', background: '#0f1320', border: '1px solid #1e2535', borderRadius: '6px', padding: '3px 9px' } }, 'SINGLE ANSWER')
      ),
      cq.type !== 'casestudy' && h('p', { style: { fontSize: '17px', fontWeight: '600', lineHeight: '1.6', marginBottom: '20px' } }, cq.question),

      // ── MCQ ──
      (!cq.type || cq.type === 'mcq') && h('div', {},
        h('div', { class: 'flex-col gap-10' },
          ...(cq.options || []).map((opt, i) => {
            const letter = ['A', 'B', 'C', 'D', 'E'][i];
            let cls = 'opt-btn';
            if (hasAnswered) {
              if (letter === cq.correctAnswer) cls += ' correct';
              else if (letter === S.userAnswers[cq.id]) cls += ' wrong';
              else cls += ' faded';
            }
            return h('button', { class: cls, disabled: hasAnswered, onClick: () => handleAnswer(cq.id, letter) },
              h('span', { class: 'opt-letter' }, letter),
              h('span', {}, opt.replace(/^[ABCDE]\)\s*/, ''))
            );
          })
        ),
        showFeedback && h('div', { style: { marginTop: '14px', background: '#080b12', border: '1px solid #1e2535', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', lineHeight: '1.6' } },
          h('strong', { style: { color: isCorrect ? '#3dd68c' : '#f06a6a' } }, isCorrect ? '✓ Correct — ' : '✗ Incorrect — '),
          cq.explanation,
          cq.sourceUrl && h('div', { style: { marginTop: '6px' } },
            h('a', { href: cq.sourceUrl, target: '_blank', style: { color: '#4f8ef7', fontSize: '12px' } }, '📎 ' + (cq.sourceName || 'Source') + ' ↗'))
        )
      ),

      // ── MULTI-SELECT ──
      cq.type === 'multi' && (() => {
        const ans = S.userAnswers[cq.id] || { selected: [], submitted: false };
        const submitted = ans.submitted;
        const sel = ans.selected || [];
        return h('div', {},
          h('div', { class: 'flex-col gap-10' },
            ...(cq.options || []).map((opt, i) => {
              const letter = ['A', 'B', 'C', 'D', 'E'][i];
              const isSelected = sel.includes(letter);
              const isCorrectOpt = (cq.correctAnswers || []).includes(letter);
              let bg = '#080b12', border = '#1e2535', col = '#dde3f0', checkBg = 'transparent', checkBorder = '#1e2535';
              if (submitted) {
                if (isCorrectOpt) { bg = 'rgba(61,214,140,0.08)'; border = 'rgba(61,214,140,0.4)'; col = '#3dd68c'; checkBg = '#3dd68c'; checkBorder = '#3dd68c'; }
                else if (isSelected && !isCorrectOpt) { bg = 'rgba(240,106,106,0.08)'; border = 'rgba(240,106,106,0.4)'; col = '#f06a6a'; checkBg = '#f06a6a'; checkBorder = '#f06a6a'; }
                else { col = '#6b748a'; }
              } else if (isSelected) {
                bg = 'rgba(245,200,66,0.08)'; border = 'rgba(245,200,66,0.4)'; col = '#f5c842'; checkBg = '#f5c842'; checkBorder = '#f5c842';
              }
              return h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: bg, border: '1px solid ' + border, borderRadius: '10px', cursor: submitted ? 'default' : 'pointer', fontSize: '14px', color: col, transition: 'all .15s' }, onClick: () => { if (!submitted) handleAnswer(cq.id, letter); } },
                h('div', { style: { width: '20px', height: '20px', borderRadius: '5px', border: '2px solid ' + checkBorder, background: isSelected ? checkBg : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', transition: 'all .15s' } },
                  isSelected && h('svg', { width: '10', height: '10', viewBox: '0 0 10 10', html: `<polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="${submitted && !isCorrectOpt ? '#fff' : '#080b12'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` })),
                h('span', { class: 'opt-letter', style: { background: '#0f1320', border: '1px solid #1e2535', color: '#6b748a', flexShrink: '0' } }, letter),
                h('span', {}, opt.replace(/^[ABCDE]\)\s*/, ''))
              );
            })
          ),
          !submitted && h('button', { class: 'btn-primary', style: { marginTop: '14px', opacity: sel.length > 0 ? '1' : '0.4' }, disabled: sel.length === 0, onClick: () => submitMulti(cq.id) }, 'Submit Answers →'),
          submitted && showFeedback && h('div', { style: { marginTop: '14px', background: '#080b12', border: '1px solid #1e2535', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', lineHeight: '1.6' } },
            h('strong', { style: { color: isCorrect ? '#3dd68c' : '#f06a6a' } }, isCorrect ? '✓ All correct! — ' : '✗ Not quite — '),
            h('span', { style: { color: '#6b748a' } }, 'Correct answers: ' + (cq.correctAnswers || []).join(', ')), h('br'),
            cq.explanation,
            cq.sourceUrl && h('div', { style: { marginTop: '6px' } }, h('a', { href: cq.sourceUrl, target: '_blank', style: { color: '#4f8ef7', fontSize: '12px' } }, '📎 ' + (cq.sourceName || 'Source') + ' ↗'))
          )
        );
      })(),

      // ── ORDER ──
      cq.type === 'order' && (() => {
        const ans = S.userAnswers[cq.id];
        const submitted = ans?.submitted;
        const placedKey = '_placed_' + cq.id;
        const steps = cq.steps || [];
        const N = steps.length;
        const correctOrder = cq.correctOrder || [];

        if (!S[placedKey]) S[placedKey] = new Array(N).fill(null);
        const placed = S[placedKey];

        const usedSet = new Set(placed.filter(x => x !== null));
        const poolSteps = steps.map((_, i) => i).filter(i => !usedSet.has(i));
        const allPlaced = placed.every(x => x !== null);

        let dragSrc = null;

        function onDragStart(e, src) { dragSrc = src; e.dataTransfer.effectAllowed = 'move'; }

        function onDropSlot(e, slotIdx) {
          e.preventDefault();
          if (!dragSrc) return;
          const np = [...placed];
          if (dragSrc.from === 'pool') {
            np[slotIdx] = dragSrc.stepIdx;
          } else {
            const tmp = np[slotIdx]; np[slotIdx] = np[dragSrc.slotIdx]; np[dragSrc.slotIdx] = tmp;
          }
          S[placedKey] = np; dragSrc = null; setState({}, false);
        }

        function onDropPool(e) {
          e.preventDefault();
          if (!dragSrc || dragSrc.from !== 'slot') return;
          const np = [...placed]; np[dragSrc.slotIdx] = null;
          S[placedKey] = np; dragSrc = null; setState({}, false);
        }

        return h('div', {},
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' } },
            // Left: pool of unplaced steps
            h('div', {},
              h('div', { style: { fontSize: '11px', fontWeight: '700', color: '#6b748a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' } }, 'Steps — drag to order →'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '40px' }, onDragover: e => e.preventDefault(), onDrop: onDropPool },
                poolSteps.length === 0
                  ? h('div', { style: { fontSize: '12px', color: '#6b748a', padding: '12px', textAlign: 'center', border: '1px dashed #1e2535', borderRadius: '8px' } }, 'All steps placed →')
                  : poolSteps.map(stepIdx =>
                      h('div', {
                        draggable: submitted ? 'false' : 'true',
                        style: { padding: '10px 14px', background: '#080b12', border: '1px solid #1e2535', borderRadius: '8px', fontSize: '13px', color: '#dde3f0', cursor: submitted ? 'default' : 'grab', lineHeight: '1.5', userSelect: 'none' },
                        onDragstart: e => onDragStart(e, { from: 'pool', stepIdx }),
                      },
                        h('span', { style: { color: '#4f8ef7', marginRight: '8px', fontSize: '11px' } }, '⠿'),
                        steps[stepIdx]
                      )
                    )
              )
            ),
            // Right: numbered drop slots
            h('div', {},
              h('div', { style: { fontSize: '11px', fontWeight: '700', color: '#6b748a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' } }, 'Your Order'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                ...placed.map((stepIdx, pos) => {
                  const isEmpty = stepIdx === null;
                  let bg = '#080b12', border = '#1e2535', col = '#dde3f0';
                  if (submitted && !isEmpty) {
                    const isRight = placed[pos] === correctOrder[pos];
                    bg = isRight ? 'rgba(61,214,140,0.08)' : 'rgba(240,106,106,0.08)';
                    border = isRight ? 'rgba(61,214,140,0.4)' : 'rgba(240,106,106,0.4)';
                    col = isRight ? '#3dd68c' : '#f06a6a';
                  }
                  const attrs = {
                    style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: isEmpty ? 'transparent' : bg, border: '1px solid ' + (isEmpty ? 'rgba(79,142,247,0.25)' : border), borderRadius: '8px', minHeight: '44px', transition: 'all .15s' },
                  };
                  if (!submitted) {
                    attrs.onDragover = e => e.preventDefault();
                    attrs.onDrop = e => onDropSlot(e, pos);
                    if (!isEmpty) { attrs.draggable = 'true'; attrs.onDragstart = e => onDragStart(e, { from: 'slot', stepIdx, slotIdx: pos }); attrs.style.cursor = 'grab'; }
                  }
                  return h('div', attrs,
                    h('span', { style: { width: '20px', height: '20px', borderRadius: '6px', background: '#0f1320', border: '1px solid #1e2535', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#4f8ef7', flexShrink: '0' } }, pos + 1),
                    isEmpty
                      ? h('span', { style: { fontSize: '12px', color: 'rgba(79,142,247,0.35)', fontStyle: 'italic' } }, 'Drop here…')
                      : h('span', { style: { fontSize: '13px', color: col, lineHeight: '1.5', flex: '1' } }, steps[stepIdx])
                  );
                })
              )
            )
          ),
          !submitted && h('button', { class: 'btn-primary', style: { opacity: allPlaced ? '1' : '0.4' }, disabled: !allPlaced, onClick: () => submitOrder(cq.id, [...placed]) }, 'Submit Order →'),
          submitted && showFeedback && h('div', { style: { marginTop: '14px', background: '#080b12', border: '1px solid #1e2535', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', lineHeight: '1.6' } },
            h('strong', { style: { color: isCorrect ? '#3dd68c' : '#f06a6a' } }, isCorrect ? '✓ Perfect order! — ' : '✗ Not quite — '),
            !isCorrect && h('div', { style: { marginBottom: '6px', color: '#6b748a' } }, 'Correct order: ' + (correctOrder || []).map((i, pos) => (pos + 1) + '. ' + (cq.steps || [])[i]).join(' → ')),
            cq.explanation,
            cq.sourceUrl && h('div', { style: { marginTop: '6px' } }, h('a', { href: cq.sourceUrl, target: '_blank', style: { color: '#4f8ef7', fontSize: '12px' } }, '📎 ' + (cq.sourceName || 'Source') + ' ↗'))
          )
        );
      })(),

      // ── CASE STUDY ──
      cq.type === 'casestudy' && (() => {
        const ans = S.userAnswers[cq.id] || { sub: {}, submitted: false };
        const submitted = ans.submitted;
        const subAnswers = ans.sub || {};
        const subKey = '_csTab_' + cq.id;
        if (S[subKey] === undefined) S[subKey] = 0;
        const activeTab = S[subKey];
        const subQs = cq.questions || [];
        const allSubAnswered = subQs.every(sq => subAnswers[sq.subId] !== undefined);

        function renderScenario(text) {
          // split on real newlines (Claude JSON uses \n escape → actual newline after JSON.parse)
          const lines = (text || '').split('\n');
          const elements = [];
          let i = 0;
          while (i < lines.length) {
            const line = lines[i];
            if (line.startsWith('## ')) {
              // Collect all content under this section heading
              const sectionName = line.slice(3).trim();
              const bullets = [];
              const paras = [];
              i++;
              while (i < lines.length && !lines[i].startsWith('## ')) {
                const l = lines[i].trim();
                if (l.startsWith('- ')) bullets.push(l.slice(2));
                else if (l) paras.push(l);
                i++;
              }
              elements.push(
                h('div', { style: { marginBottom: '16px' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
                    h('div', { style: { width: '3px', height: '14px', background: '#4f8ef7', borderRadius: '2px', flexShrink: '0' } }),
                    h('span', { style: { fontSize: '11px', fontWeight: '700', color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: '1.5px' } }, sectionName)
                  ),
                  h('div', { style: { paddingLeft: '11px', borderLeft: '1px solid #1e2535' } },
                    ...paras.map(p => h('p', { style: { fontSize: '13px', color: '#dde3f0', lineHeight: '1.7', marginBottom: bullets.length ? '6px' : '0' } }, p)),
                    bullets.length > 0 && h('ul', { style: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' } },
                      ...bullets.map(b => h('li', { style: { display: 'flex', gap: '8px', fontSize: '13px', color: '#c8d0e0', lineHeight: '1.6' } },
                        h('span', { style: { color: '#4f8ef7', flexShrink: '0', marginTop: '1px' } }, '›'),
                        h('span', {}, b)
                      ))
                    )
                  )
                )
              );
            } else {
              if (line.trim()) {
                elements.push(h('p', { style: { fontSize: '13px', color: '#dde3f0', lineHeight: '1.7', marginBottom: '8px' } }, line.trim()));
              }
              i++;
            }
          }
          return elements;
        }

        return h('div', {},
          h('div', { style: { fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#34d399' } }, cq.title || 'Case Study'),
          h('div', { style: { display: 'flex', gap: '4px', marginBottom: '0', overflowX: 'auto' } },
            h('button', { style: { padding: '8px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '8px 8px 0 0', border: '1px solid ' + (activeTab === 0 ? '#4f8ef7' : '#1e2535'), borderBottom: activeTab === 0 ? '1px solid #0f1320' : '1px solid #1e2535', background: activeTab === 0 ? '#0f1320' : 'transparent', color: activeTab === 0 ? '#4f8ef7' : '#6b748a', cursor: 'pointer', flexShrink: '0' }, onClick: () => { S[subKey] = 0; setState({}, false); } }, '📄 Scenario'),
            ...subQs.map((sq, i) => {
              const sqAns = subAnswers[sq.subId];
              const sqAnswered = sqAns !== undefined;
              const sqCorrect = submitted && sqAns === sq.correctAnswer;
              const dot = !sqAnswered ? '' : '  ' + (submitted ? (sqCorrect ? '✓' : '✗') : '●');
              const dotColor = !sqAnswered ? '#6b748a' : submitted ? (sqCorrect ? '#3dd68c' : '#f06a6a') : '#f5c842';
              const isActive = activeTab === i + 1;
              return h('button', { style: { padding: '8px 14px', fontSize: '12px', fontWeight: '600', borderRadius: '8px 8px 0 0', border: '1px solid ' + (isActive ? '#4f8ef7' : '#1e2535'), borderBottom: isActive ? '1px solid #0f1320' : '1px solid #1e2535', background: isActive ? '#0f1320' : 'transparent', color: isActive ? '#4f8ef7' : dotColor, cursor: 'pointer', flexShrink: '0', whiteSpace: 'nowrap' }, onClick: () => { S[subKey] = i + 1; setState({}, false); } }, 'Q' + String.fromCharCode(65 + i) + dot);
            })
          ),
          h('div', { style: { background: '#0f1320', border: '1px solid #4f8ef7', borderRadius: '0 8px 8px 8px', padding: '20px', minHeight: '280px' } },
            activeTab === 0
              ? h('div', { style: { maxHeight: '420px', overflowY: 'auto' } }, ...renderScenario(cq.scenario))
              : (() => {
                  const sq = subQs[activeTab - 1];
                  if (!sq) return null;
                  const sqAns = subAnswers[sq.subId];
                  const sqAnswered = sqAns !== undefined && submitted;
                  const sqCorrect = sqAnswered && sqAns === sq.correctAnswer;
                  return h('div', {},
                    h('p', { style: { fontSize: '15px', fontWeight: '600', lineHeight: '1.6', marginBottom: '18px' } }, sq.question),
                    h('div', { class: 'flex-col gap-10' },
                      ...(sq.options || []).map((opt, i) => {
                        const letter = ['A', 'B', 'C', 'D'][i];
                        const isSel = subAnswers[sq.subId] === letter;
                        const isCor = letter === sq.correctAnswer;
                        let cls = 'opt-btn';
                        if (submitted) { if (isCor) cls += ' correct'; else if (isSel) cls += ' wrong'; else cls += ' faded'; }
                        return h('button', { class: cls, style: (!submitted && isSel) ? { borderColor: '#f5c842', background: 'rgba(245,200,66,0.08)', color: '#f5c842' } : {}, disabled: submitted,
                          onClick: () => {
                            if (submitted) return;
                            const newSub = { ...subAnswers, [sq.subId]: letter };
                            setState({ userAnswers: { ...S.userAnswers, [cq.id]: { sub: newSub, submitted: false } } }, true);
                            setState({}, false);
                          } },
                          h('span', { class: 'opt-letter' }, letter),
                          h('span', {}, opt.replace(/^[ABCD]\)\s*/, ''))
                        );
                      })
                    ),
                    submitted && showFeedback && h('div', { style: { background: '#080b12', border: '1px solid #1e2535', borderRadius: '10px', padding: '12px 16px', marginTop: '14px', fontSize: '13px', lineHeight: '1.6' } },
                      h('strong', { style: { color: sqCorrect ? '#3dd68c' : '#f06a6a' } }, sqCorrect ? '✓ Correct — ' : '✗ Incorrect — '),
                      sq.explanation
                    )
                  );
                })()
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' } },
            h('span', { style: { fontSize: '12px', color: '#6b748a' } }, submitted ? 'Case study submitted' : (allSubAnswered ? 'All questions answered — ready to submit' : 'Answer all ' + subQs.length + ' questions to submit')),
            !submitted && h('button', { class: 'btn-primary', style: { opacity: allSubAnswered ? '1' : '0.4' }, disabled: !allSubAnswered,
              onClick: () => setState({ userAnswers: { ...S.userAnswers, [cq.id]: { sub: subAnswers, submitted: true } } })
            }, 'Submit Case Study →')
          ),
          submitted && showFeedback && cq.sourceUrl && h('div', { style: { marginTop: '8px' } },
            h('a', { href: cq.sourceUrl, target: '_blank', style: { color: '#4f8ef7', fontSize: '12px' } }, '📎 ' + (cq.sourceName || 'Source') + ' ↗'))
        );
      })(),

      // Navigation
      h('div', { class: 'flex', style: { justifyContent: 'space-between', marginTop: '20px' } },
        h('button', { class: 'btn-secondary', disabled: S.currentQ === 0, onClick: () => setState({ currentQ: S.currentQ - 1 }) }, '← Prev'),
        h('button', { class: 'btn-primary', onClick: () => {
          const isLast = S.currentQ >= S.questions.length - 1;
          if (!hasAnswered) {
            if (cq.type === 'multi') {
              const sel = (S.userAnswers[cq.id]?.selected) || [];
              if (sel.length > 0) submitMulti(cq.id);
              else if (!isLast) setState({ currentQ: S.currentQ + 1 });
              return;
            } else if (cq.type === 'order') {
              const placed = S['_placed_' + cq.id];
              if (placed && placed.every(x => x !== null)) submitOrder(cq.id, [...placed]);
              else if (!isLast) setState({ currentQ: S.currentQ + 1 });
              return;
            } else if (cq.type === 'casestudy') {
              const a = S.userAnswers[cq.id] || { sub: {} };
              setState({ userAnswers: { ...S.userAnswers, [cq.id]: { ...a, submitted: true } } });
              return;
            }
            if (!isLast) setState({ currentQ: S.currentQ + 1 });
            return;
          }
          if (isLast && allAnswered) { finishQuiz(); return; }
          if (!isLast) setState({ currentQ: S.currentQ + 1 });
        } }, hasAnswered ? (S.currentQ >= S.questions.length - 1 ? (allAnswered ? 'See Results →' : 'Done ✓') : 'Next →') : 'Submit & Next →')
      ),
      allAnswered && h('button', { class: 'btn-primary', style: { marginTop: '12px', width: '100%', padding: '14px', fontSize: '15px', fontWeight: '700' }, onClick: finishQuiz }, '🏁 Finish Quiz & See Results →')
    ),
    // Question dot navigation
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '16px', justifyContent: 'center' } },
      ...S.questions.map((q, i) => {
        const a = S.userAnswers[q.id];
        const answered = hasAnsweredQ(q, a);
        const color = !answered ? '#1e2535' : isCorrectAnswer(q, a) ? '#3dd68c' : '#f06a6a';
        return h('div', { class: 'nav-dot', style: { background: i === S.currentQ ? '#4f8ef7' : color }, onClick: () => setState({ currentQ: i }) });
      })
    )
  );
}
