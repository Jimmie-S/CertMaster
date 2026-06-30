/* ═══════════════════════════════════════════
   API — talks to the CertPrep backend (which calls Claude server-side)
═══════════════════════════════════════════ */

async function postJSON(path, body, signal) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok || data.error) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

// Study-plan generation + dashboard chat. (3rd arg kept for call-site compatibility; ignored —
// the backend holds the Anthropic key.)
export async function askClaude(messages, system = '') {
  const { text } = await postJSON('/api/claude', { system, messages });
  return text || '';
}

export async function askClaudeJSON(messages, system = '') {
  const { text } = await postJSON('/api/claude', { system, messages });
  const clean = String(text).replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  return JSON.parse(clean);
}

// Generate a batch of questions. The backend generates, quality-checks (heuristic gate +
// LLM judge), de-dupes against the stored bank, persists survivors, and returns them.
// startId / existing are accepted for call-site compatibility but the server owns de-duping.
export async function generateQBatch(certName, count, startId, existing = [], recentOnly = false, signal = null, topicFilter = []) {
  const { questions } = await postJSON('/api/generate', {
    cert: certName,
    count,
    recentOnly,
    topics: topicFilter,
  }, signal);
  return Array.isArray(questions) ? questions : [];
}
