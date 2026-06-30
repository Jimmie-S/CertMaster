/*
   MAIN — init and bootstrap
   Import render.js first so setRenderFn is called
   before any setState triggers a render.
═══════════════════════════════════════════ */
import './render.js';  // registers setRenderFn(render) as a side effect
import { S, setState } from './state.js';
import { storageGet, storageSet } from './storage.js';

(async () => {
  const sessions = await storageGet('cert-sessions-v2');
  if (sessions) S.sessions = sessions;

  const bank = await storageGet('cert-quiz-bank');
  if (bank) S.questionBank = bank;

  // The Anthropic key now lives on the backend — no per-user key is needed.
  // Set a sentinel so the legacy "key required" gates pass and the key modal never shows.
  S.apiKey = 'server';

  const quizResults = await storageGet('cert-quiz-results');
  if (quizResults) S.quizResults = quizResults;

  const questionStats = await storageGet('cert-question-stats');
  if (questionStats) S.questionStats = questionStats;

  // Load the shared question bank from the backend (single source of truth across devices).
  // Falls back to the local cache if the backend is unreachable.
  try {
    const res = await fetch('/api/questions');
    if (res.ok) {
      const { banks } = await res.json();
      if (banks && typeof banks === 'object') {
        S.questionBank = { ...(S.questionBank || {}), ...banks };
        await storageSet('cert-quiz-bank', S.questionBank);
      }
    }
  } catch { /* offline or backend down — use the local bank */ }

  // Trigger first render
  setState({ view: 'home' });
})();
