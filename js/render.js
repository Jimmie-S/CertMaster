/*
   RENDER — main render loop + scroll preservation
═══════════════════════════════════════════ */
import { S, setState, setRenderFn } from './state.js';
import { renderHome } from './views/home.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTopic } from './views/topic.js';
import { renderQuizSetup } from './views/quiz-setup.js';
import { renderQuizActive } from './views/quiz-active.js';
import { renderQuizResults } from './views/quiz-results.js';
import { renderQuizReview } from './views/quiz-review.js';
import { renderBank } from './views/bank.js';
import { renderApiModal, renderLoading, renderGenerating } from './views/modals.js';

// Track previous view for scroll preservation
let _prevView = null;
let _prevQuizView = null;

export function render() {
  const isSameView = S.view === _prevView &&
    (S.view !== 'quiz' || S.quizView === _prevQuizView);
  const scrollY = isSameView ? window.scrollY : 0;

  const app = document.getElementById('app');
  app.innerHTML = '';

  if (S.view === 'loading')   { app.append(renderLoading());    goto(scrollY, isSameView); return; }
  if (S.showApiModal)         { app.append(renderApiModal());   goto(0, false); return; }
  if (S.view === 'generating'){ app.append(renderGenerating()); goto(0, false); return; }
  if (S.view === 'home')      { app.append(renderHome());       goto(scrollY, isSameView); return; }
  if (S.view === 'dashboard' && S.activeSession) { app.append(renderDashboard()); goto(scrollY, isSameView); return; }
  if (S.view === 'topic' && S.activeTopic) { app.append(renderTopic()); goto(0, false); return; }
  if (S.view === 'bank')      { app.append(renderBank());       goto(scrollY, isSameView); return; }
  if (S.view === 'quiz') {
    if (S.quizView === 'setup')   app.append(renderQuizSetup());
    else if (S.quizView === 'active')  app.append(renderQuizActive());
    else if (S.quizView === 'results') app.append(renderQuizResults());
    else if (S.quizView === 'review')  app.append(renderQuizReview());
    goto(scrollY, isSameView);
    _prevQuizView = S.quizView;
    _prevView = S.view;
    return;
  }
  // fallback
  setState({ view: 'home' });

  _prevView = S.view;
  _prevQuizView = S.quizView;
}

function goto(scrollY, restore) {
  _prevView = S.view;
  if (restore && scrollY > 0) requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

// Register this render function as the state callback
setRenderFn(render);
