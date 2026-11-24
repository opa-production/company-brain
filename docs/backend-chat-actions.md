# Backend: chat actions (rename, archive, delete) and clean answers

The Brain UI now has a **⋯ menu on every chat** in the sidebar with **Rename**,
**Archive** and **Delete**, plus an **Archived** tab in History to restore or
delete archived chats. This doc lists what `opabackend` must add so those
actions persist. It also covers a prompt change that keeps answers clean.

Everything below lives in `app/brain/` (router, schemas), `app/models/brain.py`
and one new Alembic migration.

## What already exists

| Action | Endpoint | Status |
|---|---|---|
| Rename | `PATCH /api/v1/brain/conversations/{id}` `{ "title": "…" }` | ✅ Works. Needs to accept `archived` too (below). |
| Delete | `DELETE /api/v1/brain/conversations/{id}` → 204 | ✅ Works, deletes messages, writes `delete_conversation` to the audit log. No change. |
| Archive | — | ❌ **New.** |
| List archived | — | ❌ **New.** |

## 1. Database: `archived_at` on `brain_conversations`

Add a nullable timestamp. `NULL` means "in the chat list", a value means archived
(and when). A timestamp rather than a boolean lets us show "archived 3 days ago"
later and auto-purge old archives if we ever want to.

```python
# app/models/brain.py, class BrainConversation
archived_at = mapped_column(DateTime(timezone=True), nullable=True)
```

Change the list index so filtered lists stay fast:

```python
__table_args__ = (
    Index("ix_brain_conversations_admin", "admin_id", "archived_at", "last_message_at"),
)
```

Migration (`alembic revision -m "brain conversation archive"`, with
`down_revision` set to the current head from `alembic heads`):

```python
def upgrade() -> None:
    op.add_column("brain_conversations", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.drop_index("ix_brain_conversations_admin", table_name="brain_conversations")
    op.create_index(
        "ix_brain_conversations_admin", "brain_conversations",
        ["admin_id", "archived_at", "last_message_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_brain_conversations_admin", table_name="brain_conversations")
    op.create_index("ix_brain_conversations_admin", "brain_conversations", ["admin_id", "last_message_at"])
    op.drop_column("brain_conversations", "archived_at")
```

## 2. Schemas (`app/brain/schemas.py`)

`ConversationSummary` gains `archived` so the UI can tell the two lists apart.
`ConversationPatch` becomes a partial update: either field or both, at least one.

```python
class ConversationSummary(BaseModel):
    id: int
    title: str
    specialist: Optional[str]
    created_at: datetime
    last_message_at: datetime
    archived: bool = False


class ConversationPatch(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    archived: Optional[bool] = None

    @model_validator(mode="after")
    def _one_field(self):
        if self.title is None and self.archived is None:
            raise ValueError("Send a title, archived, or both.")
        return self
```

Add a small helper so every endpoint builds summaries the same way:

```python
def _summary(c: BrainConversation) -> ConversationSummary:
    return ConversationSummary(
        id=c.id, title=c.title, specialist=c.specialist,
        created_at=c.created_at, last_message_at=c.last_message_at,
        archived=c.archived_at is not None,
    )
```

`ConversationOut` inherits `archived` from `ConversationSummary`; set it in
`get_conversation` too.

## 3. Endpoints (`app/brain/router.py`)

### `GET /brain/conversations?archived=false|true`

Default (`archived=false`) returns only chats in the list. This is what the
sidebar loads, so archived chats disappear from it. `archived=true` returns only
archived chats, newest activity first (History → Archived).

```python
@router.get("/brain/conversations", response_model=ConversationListOut)
async def list_conversations(
    archived: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    user: BrainUser = Depends(get_brain_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(BrainConversation).where(BrainConversation.admin_id == user.admin_id)
    q = q.where(BrainConversation.archived_at.is_not(None) if archived else BrainConversation.archived_at.is_(None))
    rows = (await db.execute(q.order_by(BrainConversation.last_message_at.desc()).limit(limit))).scalars().all()
    return ConversationListOut(conversations=[_summary(c) for c in rows])
```

### `PATCH /brain/conversations/{id}`

Body is any of:

```jsonc
{ "title": "KRA PIN for tender" }   // rename
{ "archived": true }                // archive
{ "archived": false }               // restore
```

Returns the updated `ConversationSummary` (the UI uses it when restoring).

```python
@router.patch("/brain/conversations/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(
    conversation_id: int, body: ConversationPatch,
    user: BrainUser = Depends(get_brain_user), db: AsyncSession = Depends(get_db),
):
    convo = await _own_conversation(db, user, conversation_id)
    if body.title is not None:
        title = " ".join(body.title.split())  # trim and collapse whitespace
        if not title:
            raise HTTPException(status_code=422, detail="A chat needs a name.")
        convo.title = title
        await audit(db, admin_id=user.admin_id, action="rename_conversation",
                    target=f"conversation:{conversation_id}", ip=user.ip)
    if body.archived is not None:
        convo.archived_at = func.now() if body.archived else None
        await audit(db, admin_id=user.admin_id,
                    action="archive_conversation" if body.archived else "restore_conversation",
                    target=f"conversation:{conversation_id}", ip=user.ip)
    await db.commit()
    await db.refresh(convo)
    return _summary(convo)
```

### `DELETE /brain/conversations/{id}`

No change. It must keep working on archived chats; it already does, since
`_own_conversation` doesn't filter on `archived_at`.

### Sending a message to an archived chat

`POST /brain/chat/stream` with the `conversation_id` of an archived chat should
**restore it automatically** (`convo.archived_at = None`) before the turn runs,
so it reappears in the sidebar. Put this where the stream loads the conversation
in `_stream_turn`. Also return `archived: false` in the `meta` event if you add
the field there.

### `GET /brain/conversations/{id}`

No change in behaviour. Opening an archived chat by id still works (needed for
links and History).

## 4. Rules and edge cases

- **Ownership:** every action goes through `_own_conversation`. Another admin's
  chat id returns **404, not 403**, so ids can't be probed.
- **Errors the UI shows to the user**, as `detail` strings:
  - 404: `"That chat no longer exists."` (the UI drops the chat quietly)
  - 422: `"A chat needs a name."` / `"Send a title, archived, or both."`
- **Audit:** `rename_conversation`, `archive_conversation`,
  `restore_conversation` and the existing `delete_conversation`. Log the
  conversation id only, never the title (titles can contain the question).
- **Idempotent:** archiving an archived chat or restoring an active one returns
  200 with the current summary, not an error.
- **Rate limits:** the existing per-admin Brain limits cover these. Nothing extra needed.

## 5. Tests to add (`tests/brain/test_conversations.py`)

1. Archive → missing from `GET /conversations`, present in `?archived=true`.
2. Restore → back in the default list, `archived: false`.
3. Rename trims and collapses whitespace; an empty or whitespace-only title → 422.
4. Empty body `{}` → 422.
5. Another admin's conversation: PATCH and DELETE → 404, and nothing changes.
6. Sending a chat message into an archived conversation un-archives it.
7. Delete an archived conversation → 204 and its messages are gone.
8. Audit rows are written with the right action names and no title.

## 6. Clean answers (prompt change in `app/brain/agent.py`)

The UI now renders headings, lists, tables and code properly. It also cleans
answers on display: long dashes (—, –) become commas or colons and "•" bullets
become real lists. That is only a safety net. The model should write cleanly in
the first place, and the stored text should already be clean. Voice reads that
same text aloud, and dashes sound odd there too.

**a. Update the formatting rules in `PROMPT`.** The current rule says *"No
tables, no headings above level 3"*. Replace it with:

```text
FORMATTING
- Start with the answer in one or two plain sentences. No preamble like "Great question".
- Then structure only if it helps: "- " bullets for lists, "1. " for steps,
  "### " for a short section title when an answer has two or more parts.
- Use a small markdown table only to compare 3+ items across the same fields.
- **Bold** the key value (a PIN, an amount, a date), not whole sentences.
- Never use em dashes (—) or en dashes (–) as punctuation. Use a comma, a colon
  or a new sentence. An en dash is fine only inside number ranges, like 20–24 Dec.
- No emoji, no exclamation marks, no closing summaries that repeat the answer.
- Keep paragraphs to 3 lines at most.
```

**b. Remove the dashes from the prompt itself.** The model copies the style of
its instructions, and `PROMPT` currently uses "—" in several places (e.g.
*"the internal assistant of Ardena — the car-rental …"*,
*"WHERE FACTS COME FROM — THE RULE THAT MATTERS MOST"*). Rewrite those with
commas or colons.

**c. Optional server-side clean-up before saving.** In `_stream_turn`, after the
full answer is assembled and before the `BrainMessage` is stored, run:

```python
import re

_DASH = re.compile(r"\s+[—–]\s+")

def tidy_answer(text: str) -> str:
    text = re.sub(r"(\w)—(\w)", r"\1, \2", text)   # word—word
    return _DASH.sub(", ", text).strip()
```

Streaming tokens can stay untouched: the UI cleans them as they arrive. This
only keeps the stored copy, the export and voice clean.

## Frontend contract (already implemented in the UI)

| UI action | Call |
|---|---|
| Sidebar list on load | `GET /brain/conversations` |
| ⋯ → Rename | `PATCH /brain/conversations/{id}` `{ title }` |
| ⋯ → Archive | `PATCH /brain/conversations/{id}` `{ archived: true }` |
| ⋯ → Delete (after confirm) | `DELETE /brain/conversations/{id}` |
| History → Archived tab | `GET /brain/conversations?archived=true` |
| History → Restore | `PATCH /brain/conversations/{id}` `{ archived: false }`, which uses the returned summary |

The UI updates the list immediately and rolls back with a toast if a call fails.
Until the backend ships `archived`:

- **Archive** returns 422, so the chat pops back into the list with a toast.
- **Rename** and **Delete** already work.
- The **Archived** tab stays empty, because it only shows chats with `archived: true`.
