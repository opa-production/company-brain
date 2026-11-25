// Memory: the notes Atlas uses in every chat. "About you" notes are only
// yours; team notes are used by every admin's Atlas. Notes are added here, by
// saying "remember …" in a chat, or by pressing Save on a "Remember this?" chip.
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, User, Users } from 'lucide-react'
import * as api from '../lib/api.js'
import { dayLabel } from '../lib/brain.jsx'
import Loader from '../components/Loader.jsx'

function MemoryRow({ m, onChanged, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.content)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true); setError('')
    try { onChanged(await api.updateMemory(m.id, draft.trim())); setEditing(false) } catch (e) { setError(e.detail || "Couldn't save that.") }
    setBusy(false)
  }
  const remove = async () => {
    if (!window.confirm('Delete this memory? Atlas will stop using it.')) return
    setBusy(true)
    try { await api.deleteMemory(m.id); onDeleted(m.id) } catch (e) { setError(e.detail || "Couldn't delete that."); setBusy(false) }
  }
  return (
    <li className="memory-item">
      <div className="memory-body">
        {editing
          ? <textarea className="input" rows={2} maxLength={500} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          : <div>{m.content}</div>}
        <div className="memory-meta">
          {m.scope === 'team' && m.created_by ? `${m.created_by} · ` : ''}{dayLabel(m.updated_at)}
        </div>
        {error && <div className="msg-note">{error}</div>}
      </div>
      {m.can_edit && (editing ? (
        <span className="row-actions">
          <button className="ghost-btn sm" onClick={() => { setEditing(false); setDraft(m.content) }} disabled={busy}>Cancel</button>
          <button className="primary-btn sm" onClick={save} disabled={busy || !draft.trim()}>Save</button>
        </span>
      ) : (
        <span className="row-actions">
          <button className="icon-btn sm" title="Edit" onClick={() => setEditing(true)} disabled={busy}><Pencil size={14} /></button>
          <button className="icon-btn sm" title="Delete" onClick={remove} disabled={busy}><Trash2 size={14} /></button>
        </span>
      ))}
    </li>
  )
}

export function MemoryPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [scope, setScope] = useState('personal')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    api.memories().then(setData).catch((e) => setError(e.detail || "Couldn't load memory."))
  }, [])

  const replace = (m) => setData((d) => ({ ...d, [m.scope]: d[m.scope].map((x) => (x.id === m.id ? m : x)) }))
  const drop = (id) => setData((d) => ({ ...d, personal: d.personal.filter((x) => x.id !== id), team: d.team.filter((x) => x.id !== id) }))
  const add = async (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    setAdding(true); setError('')
    try {
      const m = await api.addMemory({ content: draft.trim(), scope })
      setData((d) => ({ ...d, [m.scope]: [m, ...d[m.scope].filter((x) => x.id !== m.id)] }))
      setDraft('')
    } catch (err) { setError(err.detail || "Couldn't save that.") }
    setAdding(false)
  }

  const card = (key, Icon, label, hint, empty, limit) => (
    <section className="settings-card">
      <header className="sc-head">
        <span className="memory-card-title"><Icon size={15} /> {label}</span>
        <span className="set-count">{data[key].length}/{limit}</span>
      </header>
      <div className="sc-body">
        <p className="muted small voice-intro">{hint}</p>
        {data[key].length
          ? <ul className="memory-list">{data[key].map((m) => <MemoryRow key={m.id} m={m} onChanged={replace} onDeleted={drop} />)}</ul>
          : <div className="muted small">{empty}</div>}
      </div>
    </section>
  )

  return (
    <div className="page memory-page">
      <div className="page-head">
        <div>
          <h2>Memory</h2>
          <p className="muted">
            What Atlas remembers and uses in every chat. Say “remember …” in a chat, or add a note here.
            Don't put PINs, passwords or bank details here; those belong in Company facts.
          </p>
        </div>
      </div>

      <form className="memory-add" onSubmit={add}>
        <input className="input" placeholder="Add a memory, e.g. “We paused Mombasa delivery in November”" value={draft} maxLength={500} onChange={(e) => setDraft(e.target.value)} />
        <div className="seg" role="radiogroup" aria-label="Who it's for">
          {[['personal', 'About me'], ['team', 'Team']].map(([k, l]) => (
            <button type="button" key={k} role="radio" aria-checked={scope === k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)}>{l}</button>
          ))}
        </div>
        <button className="primary-btn sm" type="submit" disabled={adding || !draft.trim()}>{adding ? <Loader size={13} tone="light" /> : <Plus size={14} />} Add</button>
      </form>
      {error && <div className="msg-note">{error}</div>}

      {!data && !error && <div className="muted small"><Loader size={12} /> Loading…</div>}
      {data && (
        <div className="settings-grid">
          <div className="settings-col">
            {card('personal', User, 'About you',
              'Only you see these, and only your Atlas uses them.',
              'Nothing yet. Try “Remember that I handle B2B partnerships.”', data.personal_limit)}
          </div>
          <div className="settings-col">
            {card('team', Users, 'Team',
              "Every admin's Atlas uses these. Whoever saved a note, or a super admin, can change it.",
              'No team notes yet.', data.team_limit)}
          </div>
        </div>
      )}
    </div>
  )
}
