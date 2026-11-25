# Backend: Company socials and Department reports

There are two new pages under **Company facts** in the sidebar. Until these
endpoints exist, both pages show *"…aren't switched on yet"*. The UI treats a
404 or 405 from the list call as "not shipped".

Everything goes in `app/brain/` (new `socials.py` and `reports.py` routers,
schemas) and `app/models/brain.py`, plus **one Alembic migration** for two
tables.

---

## 1. Company socials

Ardena's official accounts in one place. Everyone can read them. Atlas
quotes them when asked ("What's our Instagram?").

### Table `brain_socials`

| column | type | notes |
|---|---|---|
| `id` | int PK | |
| `platform` | varchar(20) | `website instagram linkedin x facebook tiktok youtube whatsapp email other` |
| `handle` | varchar(120) null | `@ardena.ke`, "Ardena Kenya" |
| `url` | varchar(500) | `https://…`, or a bare address for `email` |
| `created_by`, `updated_by` | FK admins | |
| `created_at`, `updated_at` | timestamptz | |

### Endpoints

```
GET    /brain/socials           → { "socials": [Social] }          any Brain user
POST   /brain/socials           { platform, handle?, url } → Social   editors
PATCH  /brain/socials/{id}      any of { platform, handle, url } → Social
DELETE /brain/socials/{id}      → 204
```

`Social = { id, platform, handle, url, updated_at }`

- **Who can edit:** the same people as company facts. Add
  `can_manage_socials` to `GET /brain/me`. The UI falls back to
  `can_manage_facts` if it's missing.
- **Validation (422, `detail` shown in the form):** an unknown platform; a `url`
  that isn't `https?://` (except `email`, which must look like an address).
  Trim whitespace. Strip tracking params (`utm_*`, `igsh`, `si`).
- **Audit:** `create_social`, `update_social`, `delete_social` with
  `social:{id}`.

### Atlas uses them

When an agent turn is built, add a short block to the context. It's cheap,
since there are only ever about 10 rows:

```text
OFFICIAL ACCOUNTS (quote exactly, never guess a handle or URL)
- Instagram: @ardena.ke, https://instagram.com/ardena.ke
- Website: https://ardena.co.ke
```

The rule in `PROMPT`: *"Only give social links from OFFICIAL ACCOUNTS. If a
platform isn't listed, say we don't have one on record."*

---

## 2. Department reports

Department heads upload a monthly report. Each report **is a knowledge-base
document** (same ingestion, OCR, viewer and citations) with a department and
the month it covers on top. Atlas can then answer *"Summarise Sales for
October"* or *"Compare Finance's September and October reports"*.

### Table `brain_reports`

| column | type | notes |
|---|---|---|
| `id` | int PK | |
| `document_id` | FK `brain_documents.id` **ON DELETE CASCADE** | the uploaded file |
| `department` | varchar(30) | `finance sales marketing operations product customer_service hr` (keep in step with `src/config.js` → `departments`) |
| `period` | date | first day of the month it covers (`2026-10-01`) |
| `title` | varchar(200) | |
| `uploaded_by` | FK admins | |
| `created_at` | timestamptz | |

Index `(department, period desc)`.

Store the document in a new KB group **`reports`** ("Department reports") so
it has its own audience. Decide who can read reports (suggested: super and
general admins, managers, plus the department's own staff). Groups already
handle that.

### Endpoints

```
GET    /brain/reports?department=&period=YYYY-MM   → { "reports": [Report] }   newest period first
POST   /brain/reports   multipart: file, department, period (YYYY-MM), title?   → Report (201)
DELETE /brain/reports/{id}                          → 204 (deletes the document too)
```

```jsonc
// Report
{
  "id": 12,
  "document_id": 340,            // the UI opens the viewer with GET /brain/kb/documents/{document_id}
  "title": "Sales monthly report",
  "department": "sales",
  "period": "2026-10",           // YYYY-MM
  "type": "pdf",                 // file extension, for the file badge
  "size": 482113,
  "status": "queued|processing|indexed|failed",   // the document's status
  "uploaded_by": "Jane Wanjiru", // display name
  "created_at": "2026-11-02T08:14:00Z",
  "can_delete": true             // uploader, or super/general admin
}
```

- **Upload:** same file types and size limit as `POST /brain/kb/documents`
  (`.pdf .docx .pptx .xlsx .csv .txt .md`). Create the document in the
  `reports` group, queue ingestion, then insert the report row. `title`
  defaults to the file name. `period` can't be in the future (422 `"Pick a
  month that has started."`).
- **One report per department per month?** Allow several, since heads re-upload
  corrected versions. The list shows them all, newest first.
- **Who can upload:** add `can_upload_reports` to `/brain/me` (suggested:
  managers and up). For now the UI shows Upload to everyone and shows the 403
  `detail` if refused.
- **List:** only reports whose document the caller can read (group check), so
  hidden reports never leak through the list.
- **Status:** the UI polls `GET /brain/reports` every 2.5 s while any report is
  `queued` or `processing`.
- **Audit:** `upload_report` and `delete_report` with `report:{id}`.

### Atlas uses them

- Index chunks with metadata `department` and `period`. Prefix each chunk
  with `"[Sales report, October 2026]"` so retrieval picks the right month.
- Specialists (finance, sales, marketing) search their **own department's
  reports first**, like they do with their KB groups.
- Citations: `{ title, group_name: "Department reports", where: "p. 3" }`,
  the same as other documents.

---

## 3. Tests

**Socials**
1. Anyone lists. A non-editor POST/PATCH/DELETE → 403.
2. A bad platform, or `ftp://` → 422. Tracking params are stripped.
3. The agent context contains every social. Asking "what's our TikTok" with
   none stored → the answer says there isn't one on record (prompt test).

**Reports**
1. Upload → 201, `status: queued`, and the document lands in the `reports` group.
2. A future `period`, an unknown department, or a bad file type → 422.
3. A user who can't read the `reports` group sees an empty list and gets a 404
   on its document.
4. Delete removes the report, its document and its chunks.
5. Only the uploader or a super/general admin can delete (`can_delete` matches).
6. `?department=sales&period=2026-10` filters correctly.
