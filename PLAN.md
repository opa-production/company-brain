# Ardena Brain — build plan

Ardena Brain is an internal AI assistant that already knows the company. You ask
it "what's our KRA PIN?", "summarise the pitch deck traction slide" or "draft
the answers for this grant form", and it answers from Ardena's own documents and
live data, with the source next to every fact.

It has three parts:

| Part | Where it lives | What it does |
|---|---|---|
| UI | This folder (`ardena-brain`), a Vite + React app, deployed to e.g. `brain.ardena.xyz` | Chat, voice mode, knowledge base, company facts |
| Backend | `opabackend`, new package `app/brain/` | Login, chat streaming, RAG, ingestion, voice proxy, audit |
| Storage | The existing Supabase Postgres (+ `pgvector`) and Supabase Storage | Documents, chunks, embeddings, conversations |

The backend goes inside opabackend rather than a new service. That way it
shares the admin accounts, the login-with-code flow, the database, the arq worker
and the deploy pipeline. There is nothing new to host apart from the static UI.

---

## 1. Login (same accounts as the admin dashboard)

- The Brain signs in with the **existing admin flow**: `POST /admin/auth/login`
  (email and password), then `POST /admin/auth/verify-otp` (6-digit code by SMS and email).
  The same accounts and passwords, and the code is still required every time.
- After the code step, the UI calls `POST /brain/auth/session`, which exchanges
  the admin token for a **Brain session token**:
  - audience `brain`, so a Brain token can't call admin endpoints and an admin token can't call Brain ones;
  - 8-hour lifetime and 30-minute idle timeout;
  - tied to the IP and user agent it was issued for;
  - revocable: a `brain_sessions` row that is checked on every request.
- **Access:** every active Ardena admin can use Brain (decided 2026-11-24).
  What each can read is limited per knowledge group by role.
- **Per-group permissions:** every knowledge group has the roles allowed to
  read it (for example, Finance & tax is for super, general and finance admins only). Retrieval
  filters by this **before** anything reaches the model, so the AI can't leak
  a document the user couldn't open themselves.
- **Restricted facts** (KRA PIN, bank details, ID numbers) are hidden in the UI
  until "Reveal" is pressed, and every reveal is audited.
- Every question, retrieved chunk, reveal, upload and download goes to
  `brain_audit_log`.
- CORS is limited to the Brain domain only, with a strict CSP and rate limits per admin and per IP.

## 2. The AI (reusing what we already have)

- Same stack as the support agent: LangGraph `create_agent`, with
  `LLM_PROVIDER` switching between DeepSeek and OpenRouter, streamed over SSE.
  The rules already learned there carry over: no `Connection: keep-alive`, 10-second heartbeats, and
  the stream opens its own DB session.
- **⚠ Provider choice matters more here than for support.** The Brain will
  send KRA PINs, financials and contracts to the model. DeepSeek stores data
  in the PRC. Use a paid provider with no training on our data (OpenRouter with `data_collection: deny`
  on a paid model, or direct Anthropic/OpenAI with zero retention) and add it to
  the privacy policy's sub-processors before real documents go in.
- The tools the model can call (all read-only, all permission-filtered):
  - `search_knowledge(query, groups?)`: hybrid RAG search (below).
  - `get_company_fact(key)`: exact values from the facts table.
  - `get_metrics(metric, period)`: live numbers (bookings, revenue, fleet,
    B2B workspaces), computed from opabackend's own tables.
  - `get_document(id)`: the full text of one document, for "summarise the pitch deck".
- **Exact facts don't come from RAG.** A registration number or KRA PIN must
  be copied exactly, never paraphrased from a chunk. They live in a
  `brain_facts` table (key, value, group, sensitivity, source document,
  last verified) that is edited in the UI. RAG is for prose; facts are for numbers.
- The SSE events drive the UI's "Thinking… / Searching knowledge base… /
  Cooking…" labels: `status` (a step label), `sources`, `token`, `done`, `error`.

## 3. RAG knowledge base

**Groups** (editable): Company docs, Legal & compliance, Pitch & investors,
Applications & grants, Finance & tax, Product & operations, Brand, Links.

**Tables**
- `kb_groups`: name, icon, roles allowed.
- `kb_documents`: group, title, type, storage path or URL, size, status
  (`uploaded → processing → indexed | failed`), checksum, uploaded_by, version.
- `kb_chunks`: document, ordinal, text, page or heading, `embedding vector(384)`,
  and a `tsvector` for keyword search.

**Ingestion** (an arq job, so uploads return immediately):
1. Upload to a private Supabase Storage bucket (`brain-kb`), never public.
2. Extract the text:
   - PDF: `pypdf`, with OCR as a fallback for scans;
   - `.docx`: `python-docx`;
   - `.pptx`: `python-pptx`;
   - `.xlsx` and `.csv`: `openpyxl` (one chunk per sheet range);
   - links: fetch the page and strip it to main text, then re-crawl weekly.
3. Chunk by headings, about 800 tokens with 100 tokens of overlap. Keep the page and heading
   so answers can cite "Pitch deck, slide 7".
4. Embed. Recommendation: **`fastembed` (bge-small, 384-dim) running on our own
   worker**. It's free, fast on CPU, and document text never leaves our
   server just to be embedded. It can be swapped for a hosted embedding API later.
5. Re-uploading a document replaces its chunks. The checksum skips files that haven't changed.

**Retrieval:** pgvector cosine search plus Postgres full-text search, merged
with reciprocal rank fusion, top 8 chunks, filtered by the user's groups.
Hybrid search matters because names and numbers ("CR12", "TCC") are matched badly
by embeddings alone.

## 4. Voice mode (ElevenLabs)

- In v1, the browser records a clip (push to talk or tap to stop) and sends it to
  `POST /brain/voice/turn`. The backend:
  1. transcribes it with ElevenLabs speech-to-text;
  2. runs the same Brain turn as text chat;
  3. streams the answer back as ElevenLabs text-to-speech audio.
- The **ElevenLabs key stays on the server.** The browser only talks to our backend.
- Voice answers use a "speakable" style: no tables, and numbers read out
  digit by digit for PINs.
- Later, ElevenLabs' Conversational AI agent with a custom LLM pointed at
  our Brain endpoint, for hands-free barge-in conversation.
- New settings: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_STT_MODEL`,
  `ELEVENLABS_TTS_MODEL`.

## 5. Backend endpoints (`/api/v1/brain/...`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/brain/auth/session` | Exchange an admin token for a Brain session |
| POST | `/brain/auth/logout` | Revoke the session |
| GET | `/brain/me` | Profile and the groups the user can read |
| GET/POST/PATCH/DELETE | `/brain/conversations[/{id}]` | Chat history |
| POST | `/brain/conversations/{id}/stream` | SSE chat turn |
| GET/POST/PATCH | `/brain/kb/groups` | Groups |
| GET/POST/DELETE | `/brain/kb/documents` | Upload, list, delete (upload = multipart) |
| POST | `/brain/kb/links` | Add a link to crawl |
| GET | `/brain/kb/documents/{id}/download` | Signed URL, 60s, audited |
| GET/PUT | `/brain/facts` | Company facts (restricted values masked) |
| POST | `/brain/facts/{key}/reveal` | Reveal a restricted value (audited) |
| POST | `/brain/voice/turn` | Voice turn (audio in, transcript and audio out) |
| GET | `/brain/audit` | Audit log (super admin) |

## 6. Build phases

1. **UI with mock data.** ✅
2. **Auth and schema.** ✅ (2026-11-24) Migration `b7r4a1n2c3d4` on opabackend branch `feat/ardena-brain`.
3. **Ingestion.** ✅ PDF, Word, PowerPoint, Excel, CSV, text, links. Runs in a background task, with a worker sweep every minute.
4. **Chat.** ✅ SSE with `status` / `sources` / `token` / `done`, knowledge tools plus the admin assistant's live-data tools, and saved history.
5. **Connect the UI.** ⏳ `src/lib/api.js` is ready, with the same callbacks as `mockBrain.js`. The pages still read the mock data.
6. **Voice.** ✅ (backend) `/brain/voice/transcribe` and `/brain/voice/speak` through ElevenLabs. The UI still runs the mock voice loop.
7. **Hardening.** Partly done: permission tests, prompt-injection rule, rate limits, audit log. Still to do: an audit review page, and semantic (embedding) search alongside full-text search.

### What changed from the original plan
- **Search is Postgres full-text search for now** (generated `tsvector` + GIN index, no extension needed). Embedding search slots into `app/brain/search.py` later without touching anything else.
- **Groups are defined in code** (`app/brain/groups.py`), not a table. Who can read what is a security decision, so changes go through code review.
- **Voice is two calls** (transcribe, then the normal chat stream, then speak) instead of one combined endpoint. The voice transcript and answer stay in the chat like any other turn.

## Decisions needed from you

- **LLM provider for the Brain.** A paid model with no training on our data is needed before real documents go in.
- **Who gets access:** all active admins (decided).
- **Which roles can read each group,** especially Finance & tax and Legal.
