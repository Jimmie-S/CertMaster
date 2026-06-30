# CertPrep backend

Express + Postgres backend that serves the frontend **and** generates / quality-checks /
stores quiz questions. Claude is called **server-side** with one API key — users no longer
bring their own.

## What it does

```
POST /api/generate   cert,count,recentOnly,topics
   → Claude generates questions
   → heuristic gate   (4+ options, valid answer key, explanation, dedupe vs the stored bank)
   → LLM judge        (a 2nd Claude pass verifies accuracy + answer key; drops bad ones)
   → store survivors in Postgres
   → returns the accepted questions + stats {generated, validStructure, unique, accepted, stored}

GET  /api/questions          → the whole shared bank, grouped by cert
GET  /api/questions?cert=AZ-900 → one cert's questions
GET  /api/certs              → [{cert, n}] counts
POST /api/claude             → capped proxy for study-plan generation + dashboard chat
GET  /api/health             → {ok, model, hasKey}

# Admin curation UI (gated by ADMIN_PASSWORD; disabled if unset)
GET    /admin                      → password-protected browser: page through stored questions,
                                      see each one's LLM-judge verdict + reason, delete bad ones
GET    /api/admin/questions?cert=  → id + data + quality + created_at  (header: x-admin-key)
DELETE /api/admin/questions/:id    → remove one question                (header: x-admin-key)
```

## Browsing / curating the bank

Set `ADMIN_PASSWORD` (env var) and open **`https://your-domain/admin`**. Enter the password to
page through every stored question per cert — correct answer highlighted, explanation, source, and
the quality-check verdict (`pass`/`fail`/`unjudged`) with the judge's reason — and delete any you
don't want. Leaving `ADMIN_PASSWORD` unset disables the admin endpoints entirely (they return 503).

The shared bank is keyed by `cert.toLowerCase().trim()` to match the frontend.

## Run locally

```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose up --build
# open http://localhost:3000
```

Or without Docker (needs a Postgres you point `DATABASE_URL` at):

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... DATABASE_URL=postgres://... npm start
```

## Deploy on Coolify

1. **Add a Postgres** resource in your project (Coolify → New → Database → PostgreSQL). Copy its
   connection string.
2. **New Application → from this Git repo**, build pack **Dockerfile** (the repo root `Dockerfile`).
3. Set environment variables (see `.env.example`):
   - `ANTHROPIC_API_KEY` — your Anthropic key (this key pays for all generation)
   - `DATABASE_URL` — the Postgres connection string from step 1
   - optionally `MODEL`, `JUDGE_MODEL`, `PGSSL`, `RATE_GENERATE`, `RATE_CLAUDE`
4. Set the app's **port to 3000** and deploy.
5. The schema is created automatically on first boot (`CREATE TABLE IF NOT EXISTS`).

The root URL now serves the working app directly — no `/CertPrep.html` and no API-key prompt.

## Notes / security

- No login (single shared bank, by design). The backend is **not** a generic Claude proxy — only
  the study-plan/chat passthrough and the question generator are exposed, both rate-limited and
  input-capped. Anyone who can reach the URL can still spend your Anthropic budget, so for a public
  deploy put it behind Coolify Basic Auth / Cloudflare Access, or lower `RATE_GENERATE`.
- `CertPrep.html` / `Certification.html` still call Anthropic directly with a user-pasted key and do
  **not** use this backend; `index.html` is the backend-connected app.
- Sessions, study plans, and quiz results remain in the browser (localStorage). Only the **question
  bank** is stored server-side, as requested.
