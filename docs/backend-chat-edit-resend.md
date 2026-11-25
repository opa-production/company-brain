# Backend: edit / ask again / retry, and a faster chat stream

The Brain UI now lets you **copy, edit or ask again** any question you've sent.
**Retry** on an answer works the same way. All three mean the same thing:
*"throw away this question and everything after it, then answer this
(possibly edited) question in its place."*

At the moment the backend can't do that. It always **appends**, so an edited
question or a retry leaves the old turns in the stored conversation. When the
chat is reopened, the old and new versions both show up. The model also sees
the discarded turns as history. This doc covers what `opabackend` needs so the
server matches what the user sees. It also lists stream changes that make the
UI feel faster.

Everything lives in `app/brain/` (router, schemas, `_stream_turn`) and
`app/models/brain.py`. **No migration is needed.**

---

## 0. The assistant is now called **Ardena Atlas**

The UI now calls the assistant **Atlas** everywhere: "Atlas can be wrong",
"Ask Atlas about this", and so on. The model has to use the same name when
someone asks who it is. In `PROMPT` (`app/brain/agent.py`), make the first line:

```text
You are Ardena Atlas ("Atlas"), the internal assistant of Ardena, the car-rental company.
If someone asks your name or what you are, say you are Ardena Atlas, Ardena's internal assistant.
Never call yourself "Brain" or "Company Brain".
```

Also rename it in any user-facing backend strings: error `detail`s like
"Brain could not answer that", the voice greeting and email or SMS text.
**Leave the API paths (`/api/v1/brain/...`), table names and audit action
names as they are.** That's internal naming, and changing it would break the
UI and old audit rows for no gain.

## 1. `POST /brain/chat/stream`: new optional field

```jsonc
{
  "message": "What is our KRA PIN?",      // the new (or same) question
  "conversation_id": 42,
  "specialist": null,
  "mode": "fast",
  "spoken": false,
  "replace_from_message_id": 1187          // NEW, optional
}
```

`replace_from_message_id` is the id of a **user** message in this
conversation. When it's present, before running the turn:

1. Load it with `conversation_id == convo.id AND role == "user"`.
   Not found → **404** `"That message no longer exists."`.
   Not a user message → **422** `"Only a question can be edited."`.
2. Delete that message **and every message after it** in the same
   conversation (`id >= replace_from_message_id`, or `created_at >=` if ids
   aren't monotonic per conversation). Feedback rows on those answers go too.
   Use an FK cascade, or delete them explicitly.
3. Carry on exactly as now: store the new user message, run the agent, store
   the answer. History for the model is built **after** the delete, so the
   discarded turns are never sent to the model.

Do steps 2–3 in one transaction with the stored user message. If the stream
fails before an answer, the user still sees their new question. Never leave
the conversation with the old turns deleted and no new question.

```python
# app/brain/schemas.py
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    conversation_id: Optional[int] = None
    specialist: Optional[str] = None
    mode: Literal["fast", "reason", "deep"] = "fast"
    spoken: bool = False
    replace_from_message_id: Optional[int] = None

    @model_validator(mode="after")
    def _replace_needs_conversation(self):
        if self.replace_from_message_id and not self.conversation_id:
            raise ValueError("replace_from_message_id needs a conversation_id.")
        return self
```

```python
# app/brain/router.py, inside _stream_turn, after _own_conversation(...)
if body.replace_from_message_id:
    anchor = await db.scalar(
        select(BrainMessage).where(
            BrainMessage.id == body.replace_from_message_id,
            BrainMessage.conversation_id == convo.id,
        )
    )
    if anchor is None:
        raise HTTPException(404, "That message no longer exists.")
    if anchor.role != "user":
        raise HTTPException(422, "Only a question can be edited.")
    await db.execute(
        delete(BrainMessage).where(
            BrainMessage.conversation_id == convo.id,
            BrainMessage.id >= anchor.id,
        )
    )
    await audit(db, admin_id=user.admin_id, action="edit_question",
                target=f"conversation:{convo.id}", ip=user.ip)
```

Raise the 404 and 422 **before** the stream starts, as a normal JSON error.
The UI reads `detail` from a non-200 response and shows it under the answer.

### Rules

- **Ownership:** only through `_own_conversation`. Another admin's
  conversation or message gives a 404 and changes nothing.
- **Audit:** `edit_question` with the conversation id only. Never log the
  question text.
- **Title:** if the replaced question was the **first** message, regenerate
  the conversation title from the new question. Send it in `meta.title`. The UI
  only takes `meta.title` for new chats today; that's fine, it's a later polish.
- **Archived chats:** same as a normal send. Restore it (`archived_at = None`).

## 2. `meta` event: return the stored question's id

The UI needs the server id of each question so it can edit it later. Questions
loaded from history already have it (`GET /conversations/{id}` returns
message ids). Questions sent in this session don't, so add it to the first
event:

```jsonc
event: meta
data: {"conversation_id": 42, "title": "KRA PIN", "specialist": null, "user_message_id": 1190}
```

So the user message must be **flushed before `meta` is sent**
(`db.add(...); await db.flush()` is enough to get the id). Without
`user_message_id`, editing a question asked earlier in the same session falls
back to appending. Nothing breaks, but the old turn stays on the server.

## 3. Make the stream feel instant

The UI now paints once per animation frame however fast tokens arrive. The
first byte and a steady flow still matter most:

| Change | Why |
|---|---|
| Send `meta` **immediately**, before retrieval or any model call | The question gets its id and the chat appears in the sidebar at once |
| Send the first `status` (`"Thinking"`) right after `meta` | No dead second before the "working" shimmer |
| Coalesce tokens into frames of about **30 to 50 ms** or about 40 chars instead of one SSE frame per token | Fewer frames to parse, same smoothness |
| Response headers `Cache-Control: no-cache`, `X-Accel-Buffering: no`, and no gzip on this route | Proxies and nginx otherwise buffer the stream and release it in bursts |
| Heartbeat `: ping` every 15 s while a slow tool runs | Keeps proxies from closing the connection (the UI already ignores `:` lines) |
| Run document retrieval for all of the user's groups **concurrently** (`asyncio.gather`) | Deep research waits on the slowest group, not the sum |

## 4. Smaller, faster reads (do these while refactoring)

- **`GET /brain/conversations/{id}`:** add `?limit=50&before_id=…` and return
  the newest 50 messages by default. Long chats open instantly. The UI will
  page older ones in later. Without the params, behaviour stays as now.
- **`GET /brain/me`:** cache `groups` and `voice_enabled` per admin for about
  60 s. It's called on every load.
- **Indexes:** `brain_messages (conversation_id, id)` makes both the
  delete-from and the paged read index-only.

## 5. Clean stored answers

The UI copies answers as plain text (no `**`, `#` or table pipes) and as
formatted HTML. It works from whatever text is stored, so the prompt rules and
`tidy_answer` in `docs/backend-chat-actions.md` §6 still apply. Answers with
clean markdown copy cleanly.

## 6. Tests (`tests/brain/test_chat_edit.py`)

1. Ask Q1 → A1, Q2 → A2. Resend with `replace_from_message_id = Q2.id` and new
   text. The conversation is Q1, A1, Q2', A2'. Q2 and A2 are gone.
2. `replace_from_message_id = Q1.id` deletes everything and the title is
   regenerated.
3. The id of an answer (`role = assistant`) → 422, nothing deleted.
4. An id from another conversation, or from another admin's → 404, nothing
   deleted.
5. `replace_from_message_id` without `conversation_id` → 422.
6. `meta` includes `user_message_id`, and it matches the stored row.
7. The model history for the new turn has no deleted messages in it (assert on
   the messages passed to the agent).
8. Feedback on a deleted answer is removed.
9. An `edit_question` audit row is written, with no question text.

## Frontend contract (already in the UI)

| UI action | Request |
|---|---|
| Send a question | `POST /brain/chat/stream` `{ message, conversation_id }` |
| ✏️ Edit question → Send | same, plus `replace_from_message_id: <that question's id>` |
| ↻ Ask again (on a question) | same, with the unchanged text |
| Retry (on an answer) | same, with the question just above that answer |

Until the backend ships this, the unknown field is ignored (Pydantic's default)
and the server appends. The UI already shows the right thread, but reopening
the chat shows the old turns as well.
