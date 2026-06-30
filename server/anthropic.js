/* ═══════════════════════════════════════════
   ANTHROPIC — server-side Claude calls (generation + LLM judge)
═══════════════════════════════════════════ */
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();              // reads ANTHROPIC_API_KEY from env
const MODEL = process.env.MODEL || 'claude-sonnet-4-6';
const JUDGE_MODEL = process.env.JUDGE_MODEL || MODEL;

function textOf(msg) {
  return (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}
function parseJsonLoose(text) {
  const cleaned = String(text).replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  return JSON.parse(cleaned);
}

export async function callClaude({ system = '', messages, max_tokens = 4000, model = MODEL }) {
  const msg = await client.messages.create({ model, max_tokens, system, messages });
  return textOf(msg);
}

export async function generateQuestions({ cert, count, recentOnly = false, topics = [], avoid = [] }) {
  const recent = recentOnly ? '\nFocus ONLY on features/updates from the last 12 months (2024-2025).' : '';
  const topicScope = topics.length
    ? `\nFocus ONLY on these specific topics: ${topics.join(', ')}. Do not generate questions outside these topics.`
    : '';
  const avoidBlock = avoid.length
    ? `\nIMPORTANT - Do NOT generate questions on these already-covered topics (even phrased differently):\n${avoid.slice(0, 40).map((t, i) => `${i + 1}. ${String(t).substring(0, 120)}`).join('\n')}`
    : '';

  const content = `You are a certification exam question writer for the EXACT exam: "${cert}".

CRITICAL: Generate questions ONLY for "${cert}". Do NOT include content from similar exams.

Generate exactly ${count} questions starting at id 1. Mix these FOUR types:

Each question MUST include a "domain" field — a short exam section name (e.g. "Identity Management", "Network Security") matching the real exam objectives for "${cert}". Use 3-6 distinct domain names across the question set.

TYPE 1 - "mcq" (single best answer scenario, ~40% of questions):
{"id":1,"type":"mcq","domain":"Identity Management","question":"Contoso Ltd has 500 users and needs to... What should you do?","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"A","explanation":"...","sourceUrl":"https://...","sourceName":"..."}

TYPE 2 - "multi" (select ALL that apply, 2-3 correct, ~25% of questions):
{"id":1,"type":"multi","domain":"Conditional Access","question":"Which THREE actions should you perform?","options":["A) ...","B) ...","C) ...","D) ...","E) ..."],"correctAnswers":["A","C","E"],"explanation":"...","sourceUrl":"https://...","sourceName":"..."}
CRITICAL for "multi": The number word in the question text (TWO/THREE/FOUR) MUST exactly match the length of "correctAnswers". If correctAnswers has 3 items, the question must say THREE. Never mismatch these.

TYPE 3 - "order" (correct sequence of steps, ~15% of questions):
{"id":1,"type":"order","domain":"Privileged Identity","question":"In which order should you perform these steps?","steps":["Step B","Step A","Step D","Step C"],"correctOrder":[1,0,3,2],"explanation":"...","sourceUrl":"https://...","sourceName":"..."}
(correctOrder = indices of steps[] arranged in the correct sequence)

TYPE 4 - "casestudy" (shared scenario + 2-3 sub-questions, ~20% of questions — counts as multiple question ids):
{"id":1,"type":"casestudy","domain":"Identity Governance","title":"Case Study: Contoso Identity Rollout","scenario":"## Background\nContoso Ltd is a financial services company with 3,000 employees across 5 countries...\n\n## Current Environment\n- Active Directory on-premises with 3 domains\n- Microsoft 365 E3 licenses\n...\n\n## Requirements\n- Users must MFA from untrusted locations\n- HR data must be access-reviewed quarterly\n...\n\n## Technical Constraints\n- No budget for new licenses\n- Must complete within 60 days","questions":[{"subId":"a","question":"You need to implement the MFA requirement. What should you configure?","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"B","explanation":"..."},{"subId":"b","question":"Which tool meets the access review requirement?","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"A","explanation":"..."}],"sourceUrl":"https://...","sourceName":"..."}

Return ONLY a valid JSON array, no markdown. For casestudy, each item counts as one entry in the array (the sub-questions are inside it). Use realistic enterprise scenarios with company names. Vary difficulty.${topicScope}${recent}${avoidBlock}`;

  const text = await callClaude({ messages: [{ role: 'user', content }], max_tokens: 6000 });
  const arr = parseJsonLoose(text);
  return Array.isArray(arr) ? arr : [];
}

/* ── LLM judge: a second pass that verifies accuracy + answer keys. ──
   Input items are heuristic-valid; returns the subset to keep, each tagged
   with a _quality verdict. Failures are dropped. If the judge call fails or
   is unparseable, we keep all items (don't block generation on the judge). */
export async function judgeQuestions({ cert, items }) {
  if (!items.length) return items;

  const compact = items.map((q, i) => ({
    i,
    type: q.type || 'mcq',
    question: q.question || q.title,
    options: q.options,
    correctAnswer: q.correctAnswer,
    correctAnswers: q.correctAnswers,
    steps: q.steps,
    correctOrder: q.correctOrder,
    sub: (q.questions || []).map(s => ({ question: s.question, options: s.options, correctAnswer: s.correctAnswer })),
  }));

  const system = 'You are a meticulous certification exam QA reviewer. Reply with ONLY a JSON array, no markdown, no prose.';
  const content = `These are draft practice questions for the "${cert}" exam. Judge EACH item independently: "pass" or "fail".
Fail the item if ANY of these is true:
- factually incorrect for the ${cert} exam
- the keyed answer is not actually the correct one
- a single-answer item (mcq / casestudy sub) has more than one defensible correct option
- a "multi" or "order" item's keyed set/sequence is wrong
- the wording is ambiguous, unanswerable, or self-contradictory
- the topic is not part of ${cert} exam objectives
Otherwise "pass".

Return ONLY a JSON array covering EVERY index: [{"i":<index>,"verdict":"pass"|"fail","reason":"<short reason>"}]

Items:
${JSON.stringify(compact)}`;

  let verdicts;
  try {
    verdicts = parseJsonLoose(await callClaude({
      system, messages: [{ role: 'user', content }], max_tokens: 2000, model: JUDGE_MODEL,
    }));
    if (!Array.isArray(verdicts)) throw new Error('judge returned non-array');
  } catch (e) {
    console.warn('[judge] unavailable, keeping heuristic-valid items:', e.message);
    return items.map(q => ({ ...q, _quality: { judged: false } }));
  }

  const byI = new Map(verdicts.map(v => [v.i, v]));
  const kept = [];
  for (let i = 0; i < items.length; i++) {
    const v = byI.get(i);
    if (v && v.verdict === 'fail') continue;            // explicit fail → drop
    kept.push({ ...items[i], _quality: { judged: true, verdict: v?.verdict || 'pass', reason: v?.reason || '' } });
  }
  return kept;
}
