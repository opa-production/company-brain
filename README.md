# Ardena Brain (UI)

The internal "company brain" for Ardena: ask about anything in the knowledge
base, look up exact company facts, pull live numbers, or talk to it in voice mode.

**Status: UI preview with mock data.** Nothing talks to a backend yet. See
[PLAN.md](PLAN.md) for how the backend (in opabackend) will be built.

```bash
npm install
npm run dev        # http://localhost:5180
```

Sign in with any email and password, then any 6 digits. That mirrors the real
admin flow: password, then a one-time code.

## Where things are

| File | What |
|---|---|
| `src/data/mock.js` | All mock data: groups, documents, links, facts, chats |
| `src/lib/mockBrain.js` | Fake streaming turn (status → sources → tokens → done), the same event shape the real SSE will send |
| `src/pages/ChatPage.jsx` | Home screen and conversation, with the "Thinking… / Searching… / Cooking…" status |
| `src/pages/KnowledgeBase.jsx` | Groups, upload, document table, links |
| `src/pages/OtherPages.jsx` | Company facts, History, Settings, Help |
| `src/components/VoiceMode.jsx` | Voice overlay (ElevenLabs later) |
| `src/pages/Login.jsx` | Two-step admin sign-in |

To connect the real backend, replace `mock.js` and `mockBrain.js` with API calls. The components don't need to change.
