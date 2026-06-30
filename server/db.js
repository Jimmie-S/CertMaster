/* ═══════════════════════════════════════════
   DB — Postgres-backed shared question bank
═══════════════════════════════════════════ */
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', e => console.error('[pg] idle client error:', e.message));

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id         BIGSERIAL PRIMARY KEY,
      cert       TEXT NOT NULL,
      hash       TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'mcq',
      data       JSONB NOT NULL,
      quality    JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (cert, hash)
    );
    CREATE INDEX IF NOT EXISTS idx_questions_cert ON questions (cert);
  `);
}

export async function existingKeyTexts(cert) {
  const { rows } = await pool.query('SELECT data FROM questions WHERE cert = $1', [cert]);
  return rows.map(r => r.data.question || r.data.title || String(r.data.scenario || '').slice(0, 160) || '');
}

// items: [{ q, hash, quality }]
export async function insertQuestions(cert, items) {
  let stored = 0;
  for (const it of items) {
    const r = await pool.query(
      `INSERT INTO questions (cert, hash, type, data, quality)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (cert, hash) DO NOTHING`,
      [cert, it.hash, it.q.type || 'mcq', JSON.stringify(it.q), it.quality ? JSON.stringify(it.quality) : null]
    );
    stored += r.rowCount;
  }
  return stored;
}

export async function getQuestions(cert, limit = 1000) {
  const { rows } = await pool.query(
    'SELECT data FROM questions WHERE cert = $1 ORDER BY created_at DESC LIMIT $2',
    [cert, limit]
  );
  return rows.map(r => r.data);
}

export async function getAllBanks() {
  const { rows } = await pool.query('SELECT cert, data FROM questions ORDER BY cert, created_at DESC');
  const banks = {};
  for (const r of rows) (banks[r.cert] ||= []).push(r.data);
  return banks;
}

export async function listCerts() {
  const { rows } = await pool.query(
    'SELECT cert, count(*)::int AS n FROM questions GROUP BY cert ORDER BY cert'
  );
  return rows;
}

/* ── Admin: includes db id + stored judge verdict, for the curation UI ── */
export async function getQuestionsAdmin(cert, limit = 2000) {
  const { rows } = await pool.query(
    'SELECT id, type, data, quality, created_at FROM questions WHERE cert = $1 ORDER BY created_at DESC LIMIT $2',
    [cert, limit]
  );
  return rows;
}

export async function deleteQuestion(id) {
  const r = await pool.query('DELETE FROM questions WHERE id = $1', [id]);
  return r.rowCount;
}
