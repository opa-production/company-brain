# Backend: read answers aloud in the typed chat

In the typed chat, the UI can now read Atlas's answers aloud. It works two ways:

- A **speaker button** on every answer reads that answer. Press it again to stop.
- A **"Read answers aloud" toggle** in the message box speaks each new answer
  as soon as it finishes. The setting is saved in the browser.

Both only show when `GET /brain/me` returns `voice_enabled: true`. They use the
**same voice** the user picked in Settings → Voice.

## What the UI uses today (no backend change needed to ship)

It calls the existing endpoint:

```
POST /api/v1/brain/voice/speak   { "text": "...", "voice": "sarah" | null }   → audio/mpeg
```

The UI cleans the answer for speech first: no markdown, tables, code, links
or citation tags. It then splits long answers at sentence ends into chunks of
**up to about 900 characters**, one request per chunk. While one chunk plays,
the next is fetched, so there are no gaps. So the backend only has to:

1. Accept `text` up to **at least 1,000 characters** (check the current
   `max_length` in the schema).
2. Allow a burst of a few calls in a row per admin. A long answer is 3 to 5
   requests in a few seconds. If the per-admin rate limit for this route is
   tighter than **20 per minute**, raise it.
3. Return a short `detail` on failure (`"Voice is busy, try again."`). The UI
   shows it under the answer.

## Recommended improvements (do with the refactor)

### a. Speak a stored message, not arbitrary text

```
POST /api/v1/brain/messages/{message_id}/speech   { "voice": "sarah" | null }   → audio/mpeg
```

- Load the message through the conversation-ownership check. Another admin's
  message gives a **404**. Only `role = "assistant"`.
- Clean it for speech on the server, using the same rules as the UI's
  `toSpeech`: strip markdown, tables, code, URLs and citation tags, and turn
  dashes into pauses.
- Stream the ElevenLabs response straight through
  (`/v1/text-to-speech/{voice}/stream`, `StreamingResponse`,
  `media_type="audio/mpeg"`). Playback starts within a second or so, even for
  long answers, and the UI can drop its chunking.

This stops `/voice/speak` being usable as a general text-to-speech service
paid for by Ardena. It also means the text spoken is always what Atlas
actually said.

### b. Cache audio

Key: `sha256(clean_text + voice + model_id)`. Store the mp3 in object storage
(or Redis for short ones) for about 7 days. Re-reading an answer, or two people
reading the same answer, then costs nothing. Old messages never change, so the
cache never goes stale.

### c. Limits and logging

- Cap the text per message at about 5,000 characters spoken. Past that, end
  with "The rest is in the chat."
- Count characters sent to ElevenLabs per admin per day (a usage table or a
  metric). This route is the main voice cost.
- Audit: `read_aloud` with `message:{id}` only. Never log the text.

## Tests

1. `/voice/speak` with 1,000 characters → 200 and audio.
2. `/messages/{id}/speech` for your own assistant message → 200 `audio/mpeg`.
3. Another admin's message, or a user message → 404 / 422.
4. The same message twice → the second is served from the cache (no
   ElevenLabs call; mock it and assert one call).
5. `voice_enabled = false` → 403 `"Voice isn't switched on for Ardena yet."`.

## Frontend contract

| UI action | Call |
|---|---|
| Speaker button on an answer | `POST /brain/voice/speak` per chunk (later: `POST /brain/messages/{id}/speech`) |
| "Read answers aloud" on | same, automatically when an answer finishes |
| Stop / new question / switching chat | the UI stops playback; nothing on the server |

Once (a) ships, the UI switches to `/messages/{id}/speech` for answers that
have a `message_id`. Answers still streaming have none yet, so they keep using
`/voice/speak`.
