/* ═══════════════════════════════════════════
   SERVER — Express: serves the frontend + /api
═══════════════════════════════════════════ */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { initDb, existingKeyTexts, insertQuestions, getQuestions, getAllBanks, listCerts, getQuestionsAdmin, deleteQuestion } from './db.js';
import { certKey, validateStructure, dedupe, hashQuestion } from './quality.js';
import { generateQuestions, judgeQuestions, callClaude } from './anthropic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const app = express();
app.set('trust proxy', true);                 // Coolify/Traefik sits in front
app.use(express.json({ limit: '1mb' }));

// Never serve backend internals as static assets.
const BLOCK = /^\/(server|node_modules|package(-lock)?\.json|Dockerfile|docker-compose|\.|.*\.bak)/i;
app.use((req, res, next) => (BLOCK.test(req.path) ? res.status(404).end() : next()));
app.use(express.static(ROOT, { extensions: ['html'] }));

// ── tiny in-memory per-IP rate limiter ──
function limiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const ip = req.ip || 'global';
    const now = Date.now();
    const e = hits.get(ip);
    if (!e || now > e.reset) { hits.set(ip, { n: 1, reset: now + windowMs }); return next(); }
    if (e.n >= max) return res.status(429).json({ error: 'Rate limit exceeded — please slow down.' });
    e.n++; next();
  };
}
const genLimit = limiter(Number(process.env.RATE_GENERATE || 12), 5 * 60 * 1000);
const claudeLimit = limiter(Number(process.env.RATE_CLAUDE || 40), 5 * 60 * 1000);

const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };

app.get('/api/health', (req, res) =>
  res.json({ ok: true, model: process.env.MODEL || 'claude-sonnet-4-6', hasKey: !!process.env.ANTHROPIC_API_KEY }));

app.get('/api/certs', async (req, res, next) => {
  try { res.json({ certs: await listCerts() }); } catch (e) { next(e); }
});

app.get('/api/questions', async (req, res, next) => {
  try {
    if (req.query.cert) {
      const cert = certKey(req.query.cert);
      res.json({ cert, questions: await getQuestions(cert, clamp(req.query.limit, 1, 2000, 1000)) });
    } else {
      res.json({ banks: await getAllBanks() });
    }
  } catch (e) { next(e); }
});

// Capped proxy for study-plan generation + dashboard chat (prompts live in the frontend).
app.post('/api/claude', claudeLimit, async (req, res, next) => {
  try {
    const { system = '', messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages[] required' });
    if (JSON.stringify(messages).length + String(system).length > 60000) return res.status(413).json({ error: 'request too large' });
    const text = await callClaude({ system, messages, max_tokens: clamp(req.body.max_tokens, 1, 4096, 4000) });
    res.json({ text });
  } catch (e) { next(e); }
});

// Generate → heuristic gate → dedupe → LLM judge → store → return.
app.post('/api/generate', genLimit, async (req, res, next) => {
  try {
    const cert = certKey(req.body?.cert);
    if (!cert) return res.status(400).json({ error: 'cert required' });
    const count = clamp(req.body?.count, 1, 15, 5);
    const recentOnly = !!req.body?.recentOnly;
    const topics = Array.isArray(req.body?.topics) ? req.body.topics.slice(0, 12).map(String) : [];

    const avoid = await existingKeyTexts(cert);
    const raw = await generateQuestions({ cert, count, recentOnly, topics, avoid });

    const valid = raw.filter(q => validateStructure(q) === null);   // heuristic gate
    const unique = dedupe(valid, avoid);                            // dedupe vs batch + stored bank
    const kept = await judgeQuestions({ cert, items: unique });     // LLM judge

    const toStore = kept.map(q => {
      const { _quality, ...clean } = q;
      return { q: clean, hash: hashQuestion(clean), quality: _quality || null };
    });
    const stored = await insertQuestions(cert, toStore);

    res.json({
      questions: kept.map(({ _quality, ...c }) => c),
      stats: { generated: raw.length, validStructure: valid.length, unique: unique.length, accepted: kept.length, stored },
    });
  } catch (e) { next(e); }
});

// ── Admin (curation) — gated by ADMIN_PASSWORD; disabled if the env var is unset ──
function admin(req, res, next) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(503).json({ error: 'Admin is disabled — set ADMIN_PASSWORD on the server to enable it.' });
  if ((req.get('x-admin-key') || '') !== pw) return res.status(401).json({ error: 'Wrong admin password.' });
  next();
}

app.get('/api/admin/questions', admin, async (req, res, next) => {
  try {
    const cert = certKey(req.query.cert);
    if (!cert) return res.status(400).json({ error: 'cert required' });
    res.json({ cert, questions: await getQuestionsAdmin(cert) });
  } catch (e) { next(e); }
});

app.delete('/api/admin/questions/:id', admin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'bad id' });
    res.json({ deleted: await deleteQuestion(id) });
  } catch (e) { next(e); }
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err?.message || err);
  res.status(err?.status || err?.statusCode || 500).json({ error: err?.message || 'server error' });
});

const PORT = Number(process.env.PORT || 3000);
initDb()
  .then(() => app.listen(PORT, () => console.log(`CertPrep server on :${PORT} (model ${process.env.MODEL || 'claude-sonnet-4-6'})`)))
  .catch(e => { console.error('DB init failed:', e.message); process.exit(1); });
