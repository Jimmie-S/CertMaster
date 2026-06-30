/* ═══════════════════════════════════════════
<<<<<<< HEAD
   PLAN — study plan generation + dashboard chat
═══════════════════════════════════════════ */
import { S, setState } from './state.js';
import { askClaudeJSON, askClaude } from './api.js';
import { saveSessions, storageSet } from './storage.js';
import { getMsfthubResources, getMsfthubUrl } from './data.js';

export async function handleStartPlan() {
  const cert = S.certInput.trim();
  if (!cert) return;
  if (!S.apiKey) { setState({ tempApiKey: '', showApiModal: true }); return; }

  setState({ genError: '', genStatus: `Researching ${cert}...`, view: 'generating' });
  const system = 'You are an expert certification coach. Return ONLY a single valid JSON object with no markdown, no code fences, no explanation.';
  const prompt = `Create a study plan for the certification: "${cert}"\n\nReturn ONLY this JSON, no markdown:\n{"cert":"${cert}","overview":"2-3 sentence description","examInfo":{"duration":"...","questions":"...","passingScore":"...","cost":"...","validity":"..."},"topics":[{"id":"topic-1","title":"...","weight":"20%","description":"1-2 sentences","subtopics":["...","..."],"resources":[{"type":"official","title":"...","url":"https://...","description":"..."},{"type":"free","title":"...","url":"https://...","description":"..."},{"type":"video","title":"...","url":"https://youtube.com","description":"..."}],"estimatedHours":5}],"studyPlan":{"totalWeeks":8,"weeklyHours":10,"phases":[{"phase":1,"name":"...","weeks":"1-2","focus":"...","topics":["topic-1"]}]},"tips":["...","...","..."]}\nInclude 4-6 realistic topics for "${cert}".`;

  try {
    setState({ genStatus: 'Building your personalized study plan...' });
    const plan = await askClaudeJSON([{ role: 'user', content: prompt }], system, S.apiKey);
    if (!plan?.topics) throw new Error('Unexpected response. Please try again.');

    const curated = getMsfthubResources(cert);
    if (curated) {
      plan.topics = plan.topics.map((topic, i) => ({
        ...topic,
        resources: i === 0
          ? [...curated.slice(0, 4), ...(topic.resources || [])]
          : [{ type: 'official', title: `MSFTHub ${cert.toUpperCase()} Resources`, url: getMsfthubUrl(cert), description: 'Community-curated study materials for this exam' }, ...(topic.resources || [])],
      }));
    }

    const session = { id: Date.now(), cert: plan.cert || cert, plan, progress: {}, createdAt: new Date().toISOString() };
    await saveSessions([session, ...S.sessions]);
    setState({ activeSession: session, certInput: '', view: 'dashboard' });
  } catch (err) {
    setState({ genError: err.message || 'Something went wrong. Please try again.' });
  }
}

export async function toggleTopicDone(topicId) {
  const prog = {
    ...S.activeSession.progress,
    [topicId]: { ...S.activeSession.progress[topicId], done: !S.activeSession.progress[topicId]?.done },
  };
  const updated = { ...S.activeSession, progress: prog };
  setState({ activeSession: updated });
  await saveSessions(S.sessions.map(s => s.id === updated.id ? updated : s));
}

export async function sendDashChat() {
  const input = S.dashChatInput.trim();
  if (!input || S.dashChatLoading) return;
  if (!S.apiKey) { setState({ tempApiKey: '', showApiModal: true }); return; }

  const userMsg = { role: 'user', content: input };
  const history = [...S.dashChat, userMsg];
  setState({ dashChat: history, dashChatInput: '', dashChatLoading: true });

  const plan = S.activeSession.plan;
  const cert = S.activeSession.cert;
  const system = `You are a study plan editor for the "${cert}" certification exam. The user can ask you to:
- Add missing topics to the study plan
- Add missing subtopics to existing topics
- Add resources to topics
- Add exam tips
- Fix incorrect information
- Answer questions about the cert

When the user asks you to modify the plan, you MUST respond with a JSON action block followed by a friendly confirmation message.

Format for modifications:
<action>
{"type":"update_plan","plan":{...full updated plan JSON...}}
</action>

The current plan JSON is:
${JSON.stringify(plan)}

If just answering a question (not modifying), respond normally with no action block.`;

  try {
    const msgs = history.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
    const reply = await askClaude(msgs, system, S.apiKey);

    const actionMatch = reply.match(/<action>([\s\S]*?)<\/action>/);
    let displayReply = reply.replace(/<action>[\s\S]*?<\/action>/, '').trim();

    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1].trim());
        if (action.type === 'update_plan' && action.plan) {
          const updated = { ...S.activeSession, plan: action.plan };
          setState({ activeSession: updated }, true);
          await storageSet('cert-sessions-v2', S.sessions.map(s => s.id === updated.id ? updated : s));
          if (!displayReply) displayReply = '✓ Study plan updated — scroll up to see changes.';
        }
      } catch (e) { displayReply = reply; }
    }

    const assistantMsg = { role: 'assistant', content: displayReply };
    setState({ dashChat: [...history, assistantMsg], dashChatLoading: false }, true);
    if (window._dashChatRenderMessages) window._dashChatRenderMessages();
    else setState({}, false);
  } catch (e) {
    setState({ dashChat: [...history, { role: 'assistant', content: 'Sorry, something went wrong: ' + e.message }], dashChatLoading: false }, true);
    if (window._dashChatRenderMessages) window._dashChatRenderMessages();
    else setState({}, false);
  }
}
=======
   QUIZ — quiz logic + exam timer
═══════════════════════════════════════════ */
import { S, setState } from './state.js';
import { saveQuizResult } from './storage.js';
import { generateQBatch } from './api.js';
import { addToBank, getBankQuestions, deduplicateBatch, getWeightedQuestions, updateQuestionStats } from './bank.js';

/* ── Exam timer (module-level — not serializable, must not be in S) ── */
let _timerInterval = null;

export function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function clearExamTimer() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
}

export function startExamTimer(durationMinutes) {
  clearExamTimer();
  S.examTimeLeft = durationMinutes * 60;
  _timerInterval = setInterval(async () => {
    if (S.examTimeLeft <= 0) {
      clearExamTimer();
      await _autoSubmit();
      return;
    }
    S.examTimeLeft--;
    const el = document.getElementById('exam-timer');
    if (el) {
      el.textContent = '⏱ ' + formatTimer(S.examTimeLeft);
      if (S.examTimeLeft < 60) { el.classList.remove('warning'); el.classList.add('critical'); }
      else if (S.examTimeLeft < 300) { el.classList.add('warning'); }
    }
  }, 1000);
}

async function _autoSubmit() {
  // Mark all unanswered questions as submitted (wrong)
  const finalAnswers = { ...S.userAnswers };
  for (const q of S.questions) {
    if (!hasAnsweredQ(q, finalAnswers[q.id])) {
      if (q.type === 'multi') finalAnswers[q.id] = { selected: [], submitted: true };
      else if (q.type === 'order') finalAnswers[q.id] = { orderedSteps: [], submitted: true };
      else if (q.type === 'casestudy') finalAnswers[q.id] = { sub: {}, submitted: true };
      // mcq stays undefined = unanswered = wrong
    }
  }
  setState({ userAnswers: finalAnswers }, true);
  await finishQuiz();
}

/* ── Finish quiz (manual or auto) ── */
export async function finishQuiz() {
  clearExamTimer();
  const cert = S.quizCert || S.activeSession?.cert || '';
  const score = calcScore();
  updateQuestionStats(cert, S.questions, S.userAnswers);
  await saveQuizResult({
    id: Date.now(),
    cert,
    score,
    total: S.questions.length,
    pct: Math.round((score / S.questions.length) * 100),
    scaledScore: calcScaledScore(),
    domainScores: calcDomainScores(),
    mode: S.quizMode,
    date: new Date().toISOString(),
  });
  setState({ quizView: 'results' });
}

/* ── Quiz start ── */
export async function startQuiz() {
  const cert = (S.quizCert.trim() || S.activeSession?.cert || '');
  if (!cert) { setState({ quizError: 'Enter a certification name.' }); return; }
  const saved = getBankQuestions(cert);
  if (S.quizSource !== 'saved' && !S.apiKey) { setState({ tempApiKey: '', showApiModal: true }); return; }
  if (S.quizSource === 'saved' && !saved.length) { setState({ quizError: 'No saved questions for this cert. Generate new ones first.' }); return; }

  clearExamTimer();
  if (S._abort) S._abort.abort();
  const ctrl = new AbortController();
  setState({ _abort: ctrl, quizLoading: true, quizError: '', questions: [], userAnswers: {}, currentQ: 0, quizView: 'active' });

  try {
    if (S.quizSource === 'saved') {
      const shuffled = getWeightedQuestions(cert, S.quizCount);
      setState({ questions: shuffled.map((q, i) => ({ ...sanitizeQuestion(q), id: i + 1 })), quizLoading: false });
      if (S.quizMode === 'exam') startExamTimer(S.examDuration);
      return;
    }

    let fromSaved = [], toGenerate = S.quizCount;
    if (S.quizSource === 'mixed' && saved.length > 0) {
      const max = Math.min(Math.floor(S.quizCount * 0.5), saved.length);
      fromSaved = getWeightedQuestions(cert, max).map(sanitizeQuestion);
      toGenerate = S.quizCount - fromSaved.length;
    }

    const firstSize = Math.min(5, toGenerate);
    const firstBatch = await generateQBatch(cert, firstSize, 1, [], S.quizFocusRecent, ctrl.signal, S.quizTopics);
    let allNew = deduplicateBatch(firstBatch, []).map(sanitizeQuestion);
    addToBank(cert, allNew);
    setState({ questions: [...fromSaved, ...allNew].map((q, i) => ({ ...q, id: i + 1 })), quizLoading: false });

    if (S.quizMode === 'exam') startExamTimer(S.examDuration);

    if (allNew.length < toGenerate) {
      setState({ quizLoadingMore: true }, true);
      const maxAttempts = Math.ceil(toGenerate / 5) + 4;
      let attempts = 0;
      while (allNew.length < toGenerate && attempts < maxAttempts && !ctrl.signal.aborted) {
        attempts++;
        const need = toGenerate - allNew.length;
        const batchSize = Math.min(5, need);
        try {
          const batch = await generateQBatch(cert, batchSize, allNew.length + 1, allNew, S.quizFocusRecent, ctrl.signal, S.quizTopics);
          if (Array.isArray(batch)) {
            const deduped = deduplicateBatch(batch, allNew).map(sanitizeQuestion);
            allNew = [...allNew, ...deduped];
            addToBank(cert, deduped);
            setState({ questions: [...fromSaved, ...allNew].map((q, i) => ({ ...q, id: i + 1 })) });
          }
        } catch (e) { if (e.name === 'AbortError') break; }
      }
      setState({ quizLoadingMore: false });
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    clearExamTimer();
    setState({ quizError: `Failed: ${err.message}`, quizLoading: false, quizLoadingMore: false, quizView: 'setup' });
  }
}

/* ── Sanitize multi-select question text to match actual correctAnswers count ── */
const NUM_WORDS = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
function sanitizeQuestion(q) {
  if (q.type !== 'multi' || !q.correctAnswers?.length) return q;
  const actual = q.correctAnswers.length;
  const word = NUM_WORDS[actual];
  if (!word) return q;
  const fixed = q.question.replace(/\b(ONE|TWO|THREE|FOUR|FIVE|SIX)\b/g, word);
  return fixed === q.question ? q : { ...q, question: fixed };
}

/* ── Answer handling ── */
export function handleAnswer(qId, answer) {
  if (S.userAnswers[qId]?.submitted) return;
  const cq = S.questions.find(q => q.id === qId);
  if (cq?.type === 'multi') {
    const current = S.userAnswers[qId]?.selected || [];
    const updated = current.includes(answer) ? current.filter(x => x !== answer) : [...current, answer];
    setState({ userAnswers: { ...S.userAnswers, [qId]: { selected: updated, submitted: false } } }, true);
    // Use render fallback without importing render.js
    setState({}, false);
  } else {
    setState({ userAnswers: { ...S.userAnswers, [qId]: answer } });
  }
}

export function submitMulti(qId) {
  const ans = S.userAnswers[qId] || { selected: [] };
  setState({ userAnswers: { ...S.userAnswers, [qId]: { ...ans, submitted: true } } });
}

export function submitOrder(qId, orderedSteps) {
  setState({ userAnswers: { ...S.userAnswers, [qId]: { orderedSteps, submitted: true } } });
}

/* ── Scoring ── */
export function isCorrectAnswer(q, ans) {
  if (!ans) return false;
  if (q.type === 'multi') {
    if (!ans.submitted) return false;
    return [...(ans.selected || [])].sort().join(',') === [...(q.correctAnswers || [])].sort().join(',');
  }
  if (q.type === 'order') {
    return ans.submitted && JSON.stringify(ans.orderedSteps) === JSON.stringify(q.correctOrder);
  }
  if (q.type === 'casestudy') {
    if (!ans?.submitted) return false;
    return (q.questions || []).every(sq => ans.sub && ans.sub[sq.subId] === sq.correctAnswer);
  }
  return ans === q.correctAnswer;
}

export function hasAnsweredQ(q, ans) {
  if (!ans) return false;
  if (q.type === 'multi' || q.type === 'order') return !!ans.submitted;
  if (q.type === 'casestudy') return !!ans.submitted;
  return ans !== undefined;
}

export function calcScore() {
  return S.questions.filter(q => isCorrectAnswer(q, S.userAnswers[q.id])).length;
}

// Scaled score 1–1000 (Microsoft-style, passing = 700)
export function calcScaledScore() {
  if (!S.questions.length) return 0;
  return Math.round((calcScore() / S.questions.length) * 1000);
}

// Per-domain breakdown: { [domain]: { correct, total } }
export function calcDomainScores() {
  const domains = {};
  for (const q of S.questions) {
    const domain = q.domain || 'General';
    if (!domains[domain]) domains[domain] = { correct: 0, total: 0 };
    domains[domain].total++;
    if (isCorrectAnswer(q, S.userAnswers[q.id])) domains[domain].correct++;
  }
  return domains;
}
>>>>>>> c65b3994e6f089e1b65123f2c5038ed533891d86
