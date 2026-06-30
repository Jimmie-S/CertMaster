/* ═══════════════════════════════════════════
<<<<<<< HEAD
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
=======
   STORAGE — localStorage helpers + SQLite backup
═══════════════════════════════════════════ */
import { S, setState } from './state.js';

export async function storageGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
export async function storageSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export async function saveSessions(list) {
  setState({ sessions: list }, true);
  await storageSet('cert-sessions-v2', list);
  setState({}, false);
}
export async function saveBank(bank) {
  setState({ questionBank: bank }, true);
  await storageSet('cert-quiz-bank', bank);
  setState({}, false);
}
export async function saveKey(key) {
  setState({ apiKey: key }, true);
  await storageSet('cert-api-key', key);
  setState({}, false);
}
export async function saveQuizResult(result) {
  const updated = [result, ...S.quizResults].slice(0, 200);
  S.quizResults = updated;
  await storageSet('cert-quiz-results', updated);
}

/* ── SQLite export ── */
export async function exportSQLite() {
  try {
    const SQL = await window.initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` });
    const db = new SQL.Database();
    db.run('CREATE TABLE certifications (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)');
    db.run('CREATE TABLE questions (id INTEGER PRIMARY KEY AUTOINCREMENT, certification_id INTEGER, question TEXT, option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT, correct_answer TEXT, explanation TEXT, source_url TEXT, source_name TEXT)');
    for (const [certName, qs] of Object.entries(S.questionBank)) {
      db.run('INSERT OR IGNORE INTO certifications (name) VALUES (?)', [certName]);
      const res = db.exec('SELECT id FROM certifications WHERE name=?', [certName]);
      const certId = res[0].values[0][0];
      for (const q of qs) {
        const correctAnswer = q.correctAnswer ?? (q.correctAnswers ? q.correctAnswers.join(',') : '');
        db.run('INSERT INTO questions (certification_id,question,option_a,option_b,option_c,option_d,correct_answer,explanation,source_url,source_name) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [certId, q.question||'', q.options?.[0]||'', q.options?.[1]||'', q.options?.[2]||'', q.options?.[3]||'', correctAnswer, q.explanation||'', q.sourceUrl||'', q.sourceName||'']);
      }
    }
    db.run('CREATE TABLE study_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, cert TEXT NOT NULL, plan_json TEXT NOT NULL, progress_json TEXT NOT NULL, created_at TEXT)');
    for (const session of S.sessions) {
      db.run('INSERT INTO study_plans (cert,plan_json,progress_json,created_at) VALUES (?,?,?,?)',
        [session.cert||'', JSON.stringify(session.plan||{}), JSON.stringify(session.progress||{}), session.createdAt||'']);
    }
    db.run('CREATE TABLE quiz_results (id INTEGER PRIMARY KEY, cert TEXT, score INTEGER, total INTEGER, pct INTEGER, mode TEXT, date TEXT)');
    for (const r of S.quizResults) {
      db.run('INSERT INTO quiz_results (id,cert,score,total,pct,mode,date) VALUES (?,?,?,?,?,?,?)',
        [r.id ?? Date.now(), r.cert||'', r.score ?? 0, r.total ?? 0, r.pct ?? 0, r.mode||'training', r.date||'']);
    }
    const data = db.export();
    db.close();
    // Use data URL instead of blob URL (works under strict CSP on Vercel)
    let binary = '';
    for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
    const base64 = btoa(binary);
    const a = document.createElement('a');
    a.href = `data:application/x-sqlite3;base64,${base64}`;
    a.download = `certprep-backup-${Date.now()}.db`;
    a.click();
  } catch (e) {
    const msg = e instanceof Error ? e.message : (typeof e === 'string' ? e : 'WASM failed to load — check network/CORS');
    setState({ bankImportStatus: { loading: false, success: false, message: `Export failed: ${msg}` } });
  }
}

/* ── SQLite import ── */
export async function importSQLite(file) {
  setState({ bankImportStatus: { loading: true, message: 'Importing…' } });
  try {
    const SQL = await window.initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` });
    const buf = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buf));
    let qImported = 0, qCerts = 0, planImported = 0, resultImported = 0;

    // Import question bank (inlined to avoid circular dep with bank.js)
    try {
      const certs = db.exec('SELECT id, name FROM certifications');
      if (certs.length) {
        const newBank = { ...S.questionBank };
        for (const [certId, certName] of certs[0].values) {
          const key = certName.toLowerCase().trim();
          const existing = newBank[key] || [];
          const existingTexts = new Set(existing.map(q => q.question.toLowerCase()));
          const rows = db.exec('SELECT question,option_a,option_b,option_c,option_d,correct_answer,explanation,source_url,source_name FROM questions WHERE certification_id=?', [certId]);
          if (rows.length) {
            const newQs = rows[0].values
              .filter(r => !existingTexts.has(r[0].toLowerCase()))
              .map(r => ({ question: r[0], options: [r[1], r[2], r[3], r[4]], correctAnswer: r[5], explanation: r[6], sourceUrl: r[7], sourceName: r[8] }));
            if (newQs.length) { newBank[key] = [...existing, ...newQs]; qImported += newQs.length; qCerts++; }
          }
        }
        setState({ questionBank: newBank }, true);
        await storageSet('cert-quiz-bank', newBank);
      }
    } catch (e) {}

    // Import study plans
    try {
      const plans = db.exec('SELECT cert, plan_json, progress_json, created_at FROM study_plans');
      if (plans.length) {
        const existingIds = new Set(S.sessions.map(s => s.cert.toLowerCase().trim()));
        const newPlans = [];
        for (const [cert, planJson, progressJson, createdAt] of plans[0].values) {
          if (existingIds.has(cert.toLowerCase().trim())) continue;
          try { newPlans.push({ id: Date.now() + Math.random(), cert, plan: JSON.parse(planJson), progress: JSON.parse(progressJson || '{}'), createdAt }); } catch (e) {}
        }
        if (newPlans.length) {
          const merged = [...newPlans, ...S.sessions];
          setState({ sessions: merged }, true);
          await storageSet('cert-sessions-v2', merged);
          planImported = newPlans.length;
        }
      }
    } catch (e) {}

    // Import quiz results
    try {
      const rows = db.exec('SELECT id,cert,score,total,pct,mode,date FROM quiz_results');
      if (rows.length) {
        const existingIds = new Set(S.quizResults.map(r => r.id));
        const newResults = rows[0].values
          .filter(r => !existingIds.has(r[0]))
          .map(r => ({ id: r[0], cert: r[1], score: r[2], total: r[3], pct: r[4], mode: r[5], date: r[6] }));
        if (newResults.length) {
          const merged = [...newResults, ...S.quizResults].sort((a, b) => b.id - a.id).slice(0, 200);
          S.quizResults = merged;
          await storageSet('cert-quiz-results', merged);
          resultImported = newResults.length;
        }
      }
    } catch (e) {}

    db.close();
    const parts = [];
    if (qImported > 0) parts.push(`${qImported} questions across ${qCerts} cert(s)`);
    if (planImported > 0) parts.push(`${planImported} study plan(s)`);
    if (resultImported > 0) parts.push(`${resultImported} quiz result(s)`);
    if (!parts.length) parts.push('Nothing new to import (all already present)');
    setState({ bankImportStatus: { loading: false, success: true, message: `Imported: ${parts.join(' · ')}` } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : (typeof e === 'string' ? e : 'WASM failed to load — check network/CORS');
    setState({ bankImportStatus: { loading: false, success: false, message: `Import failed: ${msg}` } });
  }
>>>>>>> c65b3994e6f089e1b65123f2c5038ed533891d86
}
