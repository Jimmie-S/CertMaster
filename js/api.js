/* ═══════════════════════════════════════════
   API — Anthropic Claude calls
═══════════════════════════════════════════ */
import { S } from './state.js';

export async function askClaude(messages, system = '', apiKey = null) {
  if (!apiKey) throw new Error('NO_API_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, system, messages }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || '';
}

export async function askClaudeJSON(messages, system = '', apiKey = null) {
  const text = await askClaude(messages, system, apiKey);
  const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  return JSON.parse(clean);
}

export async function generateQBatch(certName, count, startId, existing = [], recentOnly = false, signal = null, topicFilter = []) {
  const avoid = existing.length
    ? `\nIMPORTANT - Do NOT generate questions on these already-covered topics (even phrased differently):\n${existing.map((q, i) => `${i + 1}. ${(q.question || '').substring(0, 120)}`).join('\n')}`
    : '';
  const recent = recentOnly ? '\nFocus ONLY on features/updates from the last 12 months (2024-2025).' : '';
  const topicScope = topicFilter.length
    ? `\nFocus ONLY on these specific topics: ${topicFilter.join(', ')}. Do not generate questions outside these topics.`
    : '';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': S.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [{
        role: 'user',
        content: `You are a certification exam question writer for the EXACT exam: "${certName}".

CRITICAL: Generate questions ONLY for "${certName}". Do NOT include content from similar exams.

Generate exactly ${count} questions starting at id ${startId}. Mix these FOUR types:

Each question MUST include a "domain" field — a short exam section name (e.g. "Identity Management", "Network Security") matching the real exam objectives for "${certName}". Use 3-6 distinct domain names across the question set.

TYPE 1 - "mcq" (single best answer scenario, ~40% of questions):
{"id":${startId},"type":"mcq","domain":"Identity Management","question":"Contoso Ltd has 500 users and needs to... What should you do?","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"A","explanation":"...","sourceUrl":"https://...","sourceName":"..."}

TYPE 2 - "multi" (select ALL that apply, 2-3 correct, ~25% of questions):
{"id":${startId},"type":"multi","domain":"Conditional Access","question":"Which THREE actions should you perform?","options":["A) ...","B) ...","C) ...","D) ...","E) ..."],"correctAnswers":["A","C","E"],"explanation":"...","sourceUrl":"https://...","sourceName":"..."}
CRITICAL for "multi": The number word in the question text (TWO/THREE/FOUR) MUST exactly match the length of "correctAnswers". If correctAnswers has 3 items, the question must say THREE. Never mismatch these.

TYPE 3 - "order" (correct sequence of steps, ~15% of questions):
{"id":${startId},"type":"order","domain":"Privileged Identity","question":"In which order should you perform these steps?","steps":["Step B","Step A","Step D","Step C"],"correctOrder":[1,0,3,2],"explanation":"...","sourceUrl":"https://...","sourceName":"..."}
(correctOrder = indices of steps[] arranged in the correct sequence)

TYPE 4 - "casestudy" (shared scenario + 2-3 sub-questions, ~20% of questions — counts as multiple question ids):
{"id":${startId},"type":"casestudy","domain":"Identity Governance","title":"Case Study: Contoso Identity Rollout","scenario":"## Background\nContoso Ltd is a financial services company with 3,000 employees across 5 countries...\n\n## Current Environment\n- Active Directory on-premises with 3 domains\n- Microsoft 365 E3 licenses\n...\n\n## Requirements\n- Users must MFA from untrusted locations\n- HR data must be access-reviewed quarterly\n...\n\n## Technical Constraints\n- No budget for new licenses\n- Must complete within 60 days","questions":[{"subId":"a","question":"You need to implement the MFA requirement. What should you configure?","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"B","explanation":"..."},{"subId":"b","question":"Which tool meets the access review requirement?","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":"A","explanation":"..."}],"sourceUrl":"https://...","sourceName":"..."}

Return ONLY a valid JSON array, no markdown. For casestudy, each item counts as one entry in the array (the sub-questions are inside it). Use realistic enterprise scenarios with company names. Vary difficulty.${topicScope}${recent}${avoid}`,
      }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content[0].text;
  return JSON.parse(text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim());
}
