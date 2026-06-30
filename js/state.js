/*
   STATE — single source of truth
   Uses a callback pattern so render.js can register itself
   without creating a circular import.
═══════════════════════════════════════════ */
export const S = {
  view: 'loading',        // loading|home|generating|dashboard|topic|quiz|bank
  sessions: [],
  certInput: '',
  activeSession: null,
  activeTopic: null,
  genStatus: '',
  genError: '',
  // quiz
  quizView: 'setup',      // setup|active|results|review
  quizCert: '',
  quizCount: 10,
  quizMode: 'training',   // training|exam
  quizSource: 'new',      // new|mixed|saved
  quizFocusRecent: false,
  questions: [],
  userAnswers: {},
  currentQ: 0,
  quizLoading: false,
  quizLoadingMore: false,
  quizError: '',
  questionBank: {},
  // exam timer
  examDuration: 90,       // minutes — user-configurable in quiz setup
  examTimeLeft: 0,        // seconds remaining (updated by timer in quiz.js)
  // spaced repetition
  questionStats: {},      // { [certKey]: { [questionText.slice(0,100)]: { correct, wrong } } }
  // settings / api
  apiKey: '',
  showApiModal: false,
  tempApiKey: '',
  saveNote: '',
  bankImportStatus: null,
  showSettings: false,
  // results
  quizResults: [],
  // dashboard chat
  dashChat: [],
  dashChatInput: '',
  dashChatLoading: false,
  dashSelectedTopics: {},
  quizTopics: [],          // topic titles selected for quiz filtering
  // abort controller
  _abort: null,
};

let _renderFn = () => {};

export function setRenderFn(fn) {
  _renderFn = fn;
}

export function setState(patch, skipRender) {
  Object.assign(S, patch);
  if (!skipRender) _renderFn();
}
