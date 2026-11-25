# Atlas UI: refactor and clean-up list (2026-11-25)

Nothing here is broken or blocking. The app builds, and every backend feature
it calls is live. These are the things worth doing before the next round of
features, in order.

---

## 1. Fix first (small, user-visible)

### a. Hide "Upload report" from people who can't upload
`src/pages/Workspace.jsx` (`ReportsPage`) shows the button to everyone, and
non-managers only find out after picking a file (403). `/brain/me` now returns
`can_upload_reports`, so show the button only when it's true.

### b. Department names differ from the backend
| key | UI (`src/config.js`) | Backend (`app/brain/groups.py` → `DEPARTMENTS`) |
|---|---|---|
| `product` | Product & tech | Product |
| `hr` | People & HR | HR |

The backend writes the name into every report passage
("[Product report, October 2026]"), so Atlas and the page use different names.
Pick one set. The cleanest fix is for `/brain/me` to return the departments, so
the UI stops keeping its own copy (a small backend change).

### c. Chat title after editing the first question
When the first question is edited, the backend regenerates the title and sends
`meta.title_changed: true`. `App.jsx` `onMeta` only takes `meta.title` for new
chats, so the sidebar keeps the old title until a reload. Also take it when
`title_changed` is true.

## 2. Remove leftovers now that the features have shipped

- **"…aren't switched on yet" fallbacks** in `Workspace.jsx` (`notReady`, the
  404/405 notices) and the 404 message in `api.uploadReport`. Socials and
  reports are deployed, so a 404 now means something is actually wrong and
  should show as an error.
- **`me.can_manage_socials ?? me.can_manage_facts`**: the flag is always sent
  now, so drop the fallback.
- **"Brain" in comments** (`App.jsx`, `config.js`, `api.js`, `markdown.jsx`,
  `Login.jsx`): say Atlas. **Keep** the `ardena-brain-*` storage keys and the
  `/brain/...` API paths. Renaming the keys signs everyone out and loses their
  saved settings.

## 3. Split the two files that do too much

### a. `src/pages/OtherPages.jsx` (637 lines, five pages)
Facts, History, Settings (now with Memory), and Audit all live in one file.
Split it into one file per page:

```
src/pages/FactsPage.jsx
src/pages/HistoryPage.jsx
src/pages/SettingsPage.jsx      (Profile, Answers, Security, Voice)
src/pages/settings/MemoryCard.jsx
src/pages/AuditPage.jsx
```
This only moves code; nothing changes in behaviour. Do it in one commit, with
no edits mixed in, so the diff is easy to review.

### b. `src/App.jsx` (462 lines)
It holds layout and routing, and also the whole chat engine: sending, the SSE
callbacks, the per-frame token batching, patching messages, edit and retry, and
auto read-aloud. Move the chat part into a hook:

```
src/lib/useChats.js
  → { chats, activeChat, send(prompt, opts), resend(id, text), retry(id),
      stop(), rate(msg, v), openChat, removeChat, archiveChat }
```
`App.jsx` keeps the layout, view switching and `me`. This is the change that
makes the next features (alerts and automations) easy to add, because they
need to start chats and read answers from outside the chat page.

## 4. Worth doing, not urgent

- **One confirm dialog.** There are 8 `window.confirm` calls (delete a chat,
  fact, memory, document, sign out everywhere…). Replace them with one small
  `<ConfirmDialog>` that matches the app, and supports a red "Delete" button
  and Esc to cancel.
- **Page long chats.** `GET /brain/conversations/{id}?limit=50&before_id=…`
  is live (with `has_more`). Load the newest 50, and fetch older messages when
  the reader scrolls to the top. Long chats then open instantly.
- **Read aloud for saved answers.** `POST /brain/messages/{id}/speech` is live
  (cached for 7 days, so the text is always Atlas's own). It returns streaming
  mp3, but `<audio>` can't send the auth header, so playing it as it arrives
  needs `MediaSource('audio/mpeg')` and a fallback to a blob. Until then, keep
  the chunked `/voice/speak` path in `src/lib/readAloud.js`.
- **`styles.css` (1,210 lines).** Split it by area (`chat.css`, `settings.css`,
  `kb.css`, `workspace.css`) when you next touch styling. Vite bundles them
  anyway.
- **A safety net.** The repo has no lint or tests. Add ESLint with
  `react-hooks` (the `exhaustive-deps` disables in `ChatPage.jsx` are worth a
  second look), plus a `npm run build` check on push.

## Not needed

- The API client (`src/lib/api.js`) is in good shape: one `request()`, plus
  SSE parsing that ignores events it doesn't recognise. Keep adding to it.
- The memory chips, the email panel and `readAloud.js` are self-contained. They
  move with the files above unchanged.
