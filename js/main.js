/*
   MAIN — init and bootstrap
   Import render.js first so setRenderFn is called
   before any setState triggers a render.
═══════════════════════════════════════════ */
import './render.js';  // registers setRenderFn(render) as a side effect
import { S, setState } from './state.js';
import { storageGet } from './storage.js';

(async () => {
  const sessions = await storageGet('cert-sessions-v2');
  if (sessions) S.sessions = sessions;

  const bank = await storageGet('cert-quiz-bank');
  if (bank) S.questionBank = bank;

  const apiKey = await storageGet('cert-api-key');
  if (apiKey) S.apiKey = apiKey;

  const quizResults = await storageGet('cert-quiz-results');
  if (quizResults) S.quizResults = quizResults;

  const questionStats = await storageGet('cert-question-stats');
  if (questionStats) S.questionStats = questionStats;

  // Trigger first render
  setState({ view: 'home' });
})();
