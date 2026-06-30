/* ═══════════════════════════════════════════
   BANK — question bank + spaced repetition
═══════════════════════════════════════════ */
import { S, setState } from './state.js';
import { saveBank, storageSet } from './storage.js';

/* ── Similarity helpers for deduplication ── */
const STOP_WORDS = new Set(['what','which','should','would','your','that','this','when','where','have','with','from','need','will','must','does','into','about','their','they','using','after','before','order','following','company','contoso','fabrikam','woodgrove','tailwind','traders','wants','plans']);

function questionKeywords(text) {
  return new Set((text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w)));
}

function isTooSimilar(a, b, threshold = 0.55) {
  const ka = questionKeywords(a), kb = questionKeywords(b);
  if (!ka.size || !kb.size) return false;
  let overlap = 0;
  for (const w of ka) if (kb.has(w)) overlap++;
  return (overlap / Math.min(ka.size, kb.size)) >= threshold;
}

export function deduplicateBatch(batch, existing) {
  const result = [];
  const pool = [...existing];
  for (const q of batch) {
    const qText = q.question || '';
    const isDup = pool.some(e => {
      if ((e.question || '').toLowerCase() === qText.toLowerCase()) return true;
      return isTooSimilar(qText, e.question);
    });
    if (!isDup) { result.push(q); pool.push(q); }
  }
  return result;
}

export function addToBank(certName, newQs) {
  const key = certName.toLowerCase().trim();
  const existing = S.questionBank[key] || [];
  const unique = newQs.filter(nq => {
    const nqText = (nq.question || '').toLowerCase();
    return !existing.some(eq => {
      if ((eq.question || '').toLowerCase() === nqText) return true;
      return isTooSimilar(nq.question, eq.question);
    });
  });
  if (!unique.length) return 0;
  const updated = { ...S.questionBank, [key]: [...existing, ...unique] };
  saveBank(updated);
  setState({ saveNote: `+${unique.length} saved to question bank (${updated[key].length} total)` }, true);
  setTimeout(() => setState({ saveNote: '' }), 2500);
  return unique.length;
}

export function getBankQuestions(certName) {
  return S.questionBank[certName.toLowerCase().trim()] || [];
}

/* ── Spaced repetition ── */

// Inline correctness check to avoid circular dep with quiz.js
function _isCorrect(q, ans) {
  if (!ans) return false;
  if (q.type === 'multi') {
    if (!ans.submitted) return false;
    return [...(ans.selected || [])].sort().join(',') === [...(q.correctAnswers || [])].sort().join(',');
  }
  if (q.type === 'order') {
    return ans.submitted && JSON.stringify(ans.orderedSteps) === JSON.stringify(q.correctOrder);
  }
  if (q.type === 'casestudy') {
    return ans.submitted && (q.questions || []).every(sq => ans.sub && ans.sub[sq.subId] === sq.correctAnswer);
  }
  return ans === q.correctAnswer;
}

export function updateQuestionStats(certName, questions, userAnswers) {
  const key = certName.toLowerCase().trim();
  const stats = { ...S.questionStats };
  if (!stats[key]) stats[key] = {};
  for (const q of questions) {
    const k = (q.question || '').slice(0, 100);
    const curr = stats[key][k] || { correct: 0, wrong: 0 };
    if (_isCorrect(q, userAnswers[q.id])) stats[key][k] = { ...curr, correct: curr.correct + 1 };
    else stats[key][k] = { ...curr, wrong: curr.wrong + 1 };
  }
  setState({ questionStats: stats }, true);
  storageSet('cert-question-stats', stats);
}

// Weighted random sample — questions answered wrong more often get higher priority
export function getWeightedQuestions(certName, count) {
  const key = certName.toLowerCase().trim();
  const questions = [...(S.questionBank[key] || [])];
  if (questions.length <= count) return questions.sort(() => Math.random() - 0.5);

  const stats = S.questionStats[key] || {};
  const weighted = questions.map(q => {
    const k = (q.question || '').slice(0, 100);
    const st = stats[k] || { correct: 0, wrong: 0 };
    return { q, weight: 1 + st.wrong }; // unseen = weight 1, each wrong +1
  });

  const selected = [];
  const pool = [...weighted];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const total = pool.reduce((s, w) => s + w.weight, 0);
    let rand = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) { rand -= pool[idx].weight; if (rand <= 0) break; }
    selected.push(pool[idx].q);
    pool.splice(idx, 1);
  }
  return selected;
}
