/* ═══════════════════════════════════════════
   QUALITY — heuristic gate + dedupe (no API calls)
═══════════════════════════════════════════ */
import { createHash } from 'node:crypto';

export function certKey(cert) {
  // Must match the frontend bank key: certName.toLowerCase().trim()
  return String(cert || '').toLowerCase().trim();
}

const STOP = new Set(['what','which','should','would','your','that','this','when','where','have','with','from','need','will','must','does','into','about','their','they','using','after','before','order','following','company','contoso','fabrikam','woodgrove','tailwind','traders','wants','plans']);

function keywords(text) {
  return new Set(String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)));
}
function tooSimilar(a, b, t = 0.55) {
  const ka = keywords(a), kb = keywords(b);
  if (!ka.size || !kb.size) return false;
  let o = 0; for (const w of ka) if (kb.has(w)) o++;
  return o / Math.min(ka.size, kb.size) >= t;
}

export function keyText(q) {
  return q.question || q.title || String(q.scenario || '').slice(0, 160) || '';
}

export function hashQuestion(q) {
  const norm = keyText(q).toLowerCase().replace(/[^a-z0-9]/g, '');
  return createHash('sha256').update(norm).digest('hex');
}

/* ── Heuristic structural validation. Returns null if valid, else a reason. ── */
const letterIdx = l => 'ABCDEFGH'.indexOf(String(l || '').trim().toUpperCase().charAt(0));
const validLetter = (l, n) => { const i = letterIdx(l); return i >= 0 && i < n; };
const nonEmpty = s => typeof s === 'string' && s.trim().length > 0;
const optsOk = o => Array.isArray(o) && o.length >= 2 && o.length <= 8 && o.every(nonEmpty);

export function validateStructure(q) {
  if (!q || typeof q !== 'object') return 'not an object';
  const type = q.type || 'mcq';
  if (type !== 'casestudy' && !nonEmpty(q.question)) return 'empty question';

  if (type === 'mcq') {
    if (!optsOk(q.options)) return 'mcq needs 2-8 non-empty options';
    if (!validLetter(q.correctAnswer, q.options.length)) return 'mcq bad correctAnswer';
    if (!nonEmpty(q.explanation)) return 'mcq no explanation';
    return null;
  }
  if (type === 'multi') {
    if (!optsOk(q.options)) return 'multi needs options';
    if (!Array.isArray(q.correctAnswers) || q.correctAnswers.length < 2) return 'multi needs 2+ correctAnswers';
    if (!q.correctAnswers.every(l => validLetter(l, q.options.length))) return 'multi bad correctAnswers';
    return null;
  }
  if (type === 'order') {
    if (!Array.isArray(q.steps) || q.steps.length < 2 || !q.steps.every(nonEmpty)) return 'order needs steps';
    if (!Array.isArray(q.correctOrder) || q.correctOrder.length !== q.steps.length) return 'order bad correctOrder';
    const sorted = [...q.correctOrder].sort((a, b) => a - b);
    if (sorted.some((v, i) => v !== i)) return 'order correctOrder not a permutation';
    return null;
  }
  if (type === 'casestudy') {
    if (!nonEmpty(q.scenario)) return 'casestudy no scenario';
    if (!Array.isArray(q.questions) || !q.questions.length) return 'casestudy no sub-questions';
    for (const s of q.questions) {
      if (!nonEmpty(s.question)) return 'casestudy sub missing question';
      if (!optsOk(s.options)) return 'casestudy sub bad options';
      if (!validLetter(s.correctAnswer, s.options.length)) return 'casestudy sub bad answer';
    }
    return null;
  }
  return `unknown type "${type}"`;
}

/* ── Drop near-duplicates within the batch and against existing key-texts. ── */
export function dedupe(batch, existingTexts = []) {
  const pool = [...existingTexts];
  const out = [];
  for (const q of batch) {
    const t = keyText(q);
    const dup = pool.some(e => e.toLowerCase() === t.toLowerCase() || tooSimilar(t, e));
    if (!dup) { out.push(q); pool.push(t); }
  }
  return out;
}
