import { useEffect, useRef, useState } from 'react'
import {
  Copy, Check, Eye, EyeOff, Lock, FileText, MessageSquare, ShieldCheck, LogOut,
  Plus, Pencil, Trash2, ScrollText, Play, Square, Archive, ArchiveRestore, X,
} from 'lucide-react'
import { models, ROLE_LABELS, SPEAK_KEY, VOICE_KEY, VOICES, DEFAULT_VOICE } from '../config.js'
import * as api from '../lib/api.js'
import { pageCache } from '../lib/cache.js'
import { useBrain, dayLabel } from '../lib/brain.jsx'
import Select from '../components/Select.jsx'
import UserAvatar from '../components/UserAvatar.jsx'
import Loader from '../components/Loader.jsx'
import { FactsSkeleton, TableSkeleton } from '../components/Skeletons.jsx'

const EMPTY_FACT = { key: '', label: '', value: '', group: '', restricted: false, source: '' }

function FactForm({ initial, groups, onSaved, onCancel }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isNew = !initial.key
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = async (e) => {
    e.preventDefault()
    const key = isNew ? f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) : f.key
    if (!key || key.length < 2) return setError('Give the fact a label.')
    setSaving(true)
    setError('')
    try {
      const saved = await api.saveFact(key, {
        label: f.label.trim(), value: f.value.trim(), group: f.group, restricted: f.restricted, source: f.source.trim() || null,
      })
      onSaved(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const groupOptions = groups.filter((g) => g.key !== 'links').map((g) => ({ value: g.key, label: g.name }))

  return (
    <form className="fact-card fact-form" onSubmit={(e) => { if (!f.group) { e.preventDefault(); return setError('Choose a group.') } save(e) }}>
      <div className="ff-head">
        <span className="ff-title">{isNew ? 'New fact' : 'Edit fact'}</span>
        <button type="button" className="icon-btn sm" title="Cancel" onClick={onCancel}><X size={15} /></button>
      </div>
      <label className="field">Label
        <input className="input" value={f.label} onChange={set('label')} placeholder="e.g. KRA PIN" required autoFocus={isNew} />
      </label>
      <label className="field">Value
        <input
          className="input mono"
          value={f.value}
          onChange={set('value')}
          placeholder={f.restricted && !isNew ? 'Enter the value again to change it' : 'Exact value, copied from the certificate'}
          required
        />
      </label>
      <div className="ff-row">
        <div className="field">Group
          <Select value={f.group} onChange={(v) => setF({ ...f, group: v })} options={groupOptions} placeholder="Choose a group" invalid={error === 'Choose a group.'} />
        </div>
        <label className="field">Source
          <input className="input" value={f.source} onChange={set('source')} placeholder="KRA PIN certificate.pdf" />
        </label>
      </div>
      <label className="switch ff-switch">
        <input type="checkbox" checked={f.restricted} onChange={set('restricted')} />
        <span className="switch-track"><span className="switch-thumb" /></span>
        <span className="switch-text">
          <span className="switch-label">Restricted</span>
          <span className="muted small">Masked until someone reveals it. Every reveal is logged.</span>
        </span>
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="ff-foot">
        <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
        <button className="primary-btn" disabled={saving}>{saving ? <Loader size={16} tone="light" /> : isNew ? 'Add fact' : 'Save changes'}</button>
      </div>
    </form>
  )
}

export function FactsPage() {
  const { me, groups } = useBrain()
  const [facts, setFactsState] = useState(() => pageCache.get('facts') || null)
  // Keep the module cache in step so returning to the page is instant.
  const setFacts = (v) => setFactsState((prev) => { const next = typeof v === 'function' ? v(prev) : v; pageCache.set('facts', next); return next })
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState({})
  const [copied, setCopied] = useState(null)
  const [editing, setEditing] = useState(null) // fact key, or 'new'
  const canEdit = me.can_manage_facts

  const load = () => api.facts().then(setFacts).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const reveal = async (key) => {
    if (revealed[key] !== undefined) return setRevealed(({ [key]: _, ...rest }) => rest)
    try {
      const r = await api.revealFact(key)
      setRevealed((v) => ({ ...v, [key]: r.value }))
    } catch (e) {
      setError(e.message)
    }
  }

  const remove = async (f) => {
    if (!window.confirm(`Delete “${f.label}”? Atlas will stop quoting it.`)) return
    try {
      await api.deleteFact(f.key)
      setFacts((all) => all.filter((x) => x.key !== f.key))
    } catch (e) {
      setError(e.message)
    }
  }

  const saved = (fact) => {
    setFacts((all) => [...all.filter((x) => x.key !== fact.key), fact])
    setRevealed(({ [fact.key]: _, ...rest }) => rest)
    setEditing(null)
  }

  if (!facts) {
    return (
      <div className="page">
        <div className="page-head"><div><h2>Company facts</h2><p className="muted">Exact values Atlas quotes word for word: registration numbers, PINs, certificates.</p></div></div>
        {error ? <div className="notice bad">{error}</div> : <FactsSkeleton />}
      </div>
    )
  }

  const order = groups.map((g) => g.key)
  const present = [...new Set(facts.map((f) => f.group))].sort((a, b) => order.indexOf(a) - order.indexOf(b))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Company facts</h2>
          <p className="muted">Exact values Atlas quotes word for word: registration numbers, PINs, certificates. Restricted values are masked, and every reveal is logged.</p>
        </div>
        {canEdit && editing !== 'new' && <button className="primary-btn" onClick={() => setEditing('new')}><Plus size={16} /> Add fact</button>}
      </div>
      {error && <div className="notice bad" onClick={() => setError('')}>{error}</div>}

      {editing === 'new' && (
        <section className="facts-section">
          <div className="facts-grid">
            <FactForm initial={EMPTY_FACT} groups={groups} onSaved={saved} onCancel={() => setEditing(null)} />
          </div>
        </section>
      )}

      {facts.length === 0 && editing !== 'new' && (
        <div className="empty">
          No company facts yet.{canEdit ? ' Add the registration number, KRA PIN and the like so Atlas can quote them exactly.' : ' A super or general admin can add them.'}
        </div>
      )}

      {present.map((gid) => (
        <section key={gid} className="facts-section">
          <h3>{groups.find((k) => k.key === gid)?.name || gid}</h3>
          <div className="facts-grid">
            {facts.filter((f) => f.group === gid).sort((a, b) => a.label.localeCompare(b.label)).map((f) => {
              if (editing === f.key) {
                return (
                  <FactForm
                    key={f.key}
                    initial={{ key: f.key, label: f.label, value: f.restricted ? (revealed[f.key] || '') : f.value, group: f.group, restricted: f.restricted, source: f.source || '' }}
                    groups={groups}
                    onSaved={saved}
                    onCancel={() => setEditing(null)}
                  />
                )
              }
              const value = f.restricted ? revealed[f.key] : f.value
              const show = value !== undefined && value !== null
              return (
                <div key={f.key} className="fact-card">
                  <div className="fact-label">{f.label} {f.restricted && <span className="restricted"><Lock size={11} /> Restricted</span>}</div>
                  <div className={`fact-value ${show ? '' : 'masked'}`}>{show ? value : '•••• •••• ••••'}</div>
                  <div className="fact-foot">
                    <span className="muted small"><FileText size={12} /> {f.source || 'No source given'}</span>
                    <span className="row-actions">
                      {f.restricted && (
                        <button className="icon-btn sm" title={show ? 'Hide' : 'Reveal (logged)'} onClick={() => reveal(f.key)}>
                          {show ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                      <button
                        className="icon-btn sm"
                        title="Copy"
                        disabled={!show}
                        onClick={() => { navigator.clipboard?.writeText(value); setCopied(f.key); setTimeout(() => setCopied(null), 1400) }}
                      >
                        {copied === f.key ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                      {canEdit && <button className="icon-btn sm" title="Edit" onClick={() => setEditing(f.key)}><Pencil size={15} /></button>}
                      {canEdit && <button className="icon-btn sm" title="Delete" onClick={() => remove(f)}><Trash2 size={15} /></button>}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export function HistoryPage({ chats, openChat, removeChat, archiveChat, onRestored }) {
  const [tab, setTab] = useState('chats')
  const [archived, setArchived] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (tab !== 'archived') return
    setArchived(null)
    setError('')
    api.conversations({ archived: true })
      .then((r) => setArchived(r.conversations.filter((c) => c.archived)))
      .catch((e) => { setArchived([]); setError(e.message) })
  }, [tab])

  const restore = async (c) => {
    setArchived((list) => list.filter((x) => x.id !== c.id))
    try {
      const updated = await api.archiveConversation(c.id, false)
      onRestored(updated || c)
    } catch (e) {
      setArchived((list) => [c, ...list])
      setError(e.message)
    }
  }

  const destroyArchived = async (c) => {
    if (!window.confirm(`Delete “${c.title}” for good? This can't be undone.`)) return
    setArchived((list) => list.filter((x) => x.id !== c.id))
    try { await api.deleteConversation(c.id) } catch (e) { setArchived((list) => [c, ...list]); setError(e.message) }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>History</h2><p className="muted">Your conversations. Only you can see them.</p></div>
        <div className="viewer-tabs">
          <button className={tab === 'chats' ? 'on' : ''} onClick={() => setTab('chats')}>Chats</button>
          <button className={tab === 'archived' ? 'on' : ''} onClick={() => setTab('archived')}>Archived</button>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}

      {tab === 'chats' ? (
        <div className="table">
          {chats.map((c) => (
            <div key={c.id} className="tr history-row clickable" onClick={() => openChat(c.id)}>
              <span className="doc-cell"><MessageSquare size={16} /> {c.title}</span>
              <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                <span className="muted">{c.day}</span>
                <button className="icon-btn sm" title="Archive" disabled={!c.serverId} onClick={() => archiveChat(c.id)}><Archive size={15} /></button>
                <button
                  className="icon-btn sm"
                  title="Delete chat"
                  onClick={() => { if (window.confirm(`Delete “${c.title}” for good? This can't be undone.`)) removeChat(c.id) }}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          ))}
          {chats.length === 0 && <div className="empty">No conversations yet.</div>}
        </div>
      ) : (
        <div className="table">
          {archived === null && <TableSkeleton rows={4} badge={false} />}
          {archived?.map((c) => (
            <div key={c.id} className="tr history-row">
              <span className="doc-cell"><Archive size={16} /> {c.title}</span>
              <span className="row-actions">
                <span className="muted">{dayLabel(c.last_message_at)}</span>
                <button className="icon-btn sm" title="Restore to chat list" onClick={() => restore(c)}><ArchiveRestore size={15} /></button>
                <button className="icon-btn sm" title="Delete for good" onClick={() => destroyArchived(c)}><Trash2 size={15} /></button>
              </span>
            </div>
          ))}
          {archived?.length === 0 && !error && <div className="empty">No archived chats. Archive one from the ⋯ menu in the chat list.</div>}
        </div>
      )}
    </div>
  )
}

export function SettingsPage({ onLogout, onLoggedOutEverywhere, model, setModel, onAudit }) {
  const { me } = useBrain()
  const user = me.user
  const [speakAnswers, setSpeakAnswers] = useState(() => localStorage.getItem(SPEAK_KEY) !== 'off')
  const [busy, setBusy] = useState(false)
  const [voice, setVoice] = useState(() => localStorage.getItem(VOICE_KEY) || me.default_voice || DEFAULT_VOICE)
  const [previewing, setPreviewing] = useState(null)

  // Samples are static files shipped with the UI (public/voices/<key>.mp3),
  // so hearing a voice before picking it never calls the backend.
  const sampleRef = useRef(null)
  const [noSample, setNoSample] = useState(null)
  const preview = (key) => {
    sampleRef.current?.pause()
    if (previewing === key) return setPreviewing(null)
    const audio = new Audio(`/voices/${key}.mp3`)
    sampleRef.current = audio
    setNoSample(null)
    setPreviewing(key)
    audio.onended = () => setPreviewing(null)
    audio.onerror = () => { setPreviewing(null); setNoSample(key) }
    audio.play().catch(() => setPreviewing(null))
  }
  useEffect(() => () => sampleRef.current?.pause(), [])
  const pickVoice = (key) => {
    setVoice(key)
    localStorage.setItem(VOICE_KEY, key)
  }


  const toggleSpeak = () => {
    const next = !speakAnswers
    setSpeakAnswers(next)
    localStorage.setItem(SPEAK_KEY, next ? 'on' : 'off')
  }

  const everywhere = async () => {
    if (!window.confirm('Sign out of Ardena Atlas on every device, including this one?')) return
    setBusy(true)
    try { await api.logoutEverywhere() } catch { /* signed out regardless */ }
    onLoggedOutEverywhere()
  }

  const voiceRow = (v) => {
    const on = voice === v.key
    const playing = previewing === v.key
    return (
      <div
        key={v.key}
        className={`voice-row ${on ? 'on' : ''} ${playing ? 'playing' : ''}`}
        onClick={() => pickVoice(v.key)}
        role="radio"
        aria-checked={on}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickVoice(v.key) } }}
      >
        <span className="voice-avatar">
          <img src={`/voices/avatars/${v.key}.svg`} alt="" draggable="false" />
          {on && <span className="voice-check"><Check size={11} strokeWidth={3} /></span>}
        </span>
        <span className="voice-who">
          <span className="voice-name">{v.name}</span>
          <span className="voice-sub">{noSample === v.key ? 'Sample not available' : playing ? 'Playing sample…' : on ? 'Your voice' : 'Tap to choose'}</span>
        </span>
        <span className="voice-style">{v.style}</span>
        <button
          className="voice-play"
          title={playing ? 'Stop' : `Hear ${v.name}`}
          onClick={(e) => { e.stopPropagation(); preview(v.key) }}
        >
          {playing ? <span className="eq"><i /><i /><i /></span> : <Play size={13} fill="currentColor" />}
        </button>
      </div>
    )
  }

  return (
    <div className="page settings-page">
      <div className="page-head"><div><h2>Settings</h2><p className="muted">Your profile, how Atlas answers, its voice and your session.</p></div></div>

      <div className="settings-grid">
        <div className="settings-col">
          <section className="settings-card">
            <header className="sc-head">Profile</header>
            <div className="sc-body profile-row">
              <UserAvatar user={user} size="lg" />
              <div className="profile-text">
                <div className="profile-name">{user.name}</div>
                <div className="muted small">{user.email}</div>
              </div>
              <span className="role-tag"><ShieldCheck size={13} /> {ROLE_LABELS[user.role] || user.role}</span>
            </div>
            <footer className="sc-foot">
              <span className="muted small credit">
                Profile picture: <a href="https://www.flaticon.com/free-icons/animals" title="animals icons" target="_blank" rel="noreferrer">Animals icons created by Magnific - Flaticon</a>
              </span>
              <button className="danger-btn" onClick={onLogout}><LogOut size={15} /> Sign out</button>
            </footer>
          </section>

          <section className="settings-card">
            <header className="sc-head">Answers</header>
            <div className="sc-body set-list">
              <div className="set-row">
                <div className="set-text">
                  <div className="set-label">Default mode</div>
                  <div className="set-hint">{models.find((m) => m.id === model)?.hint}.</div>
                </div>
                <div className="seg" role="radiogroup" aria-label="Default mode">
                  {models.map((m) => (
                    <button key={m.id} role="radio" aria-checked={model === m.id} className={model === m.id ? 'on' : ''} onClick={() => setModel(m.id)}>{m.name}</button>
                  ))}
                </div>
              </div>
              <div className="set-row stack">
                <div className="set-text">
                  <div className="set-label">Knowledge you can read <span className="set-count">{me.groups.length}</span></div>
                  <div className="set-hint">Atlas always searches these when it answers you.</div>
                </div>
                <ul className="group-list">
                  {me.groups.map((g) => <li key={g.key}>{g.name}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section className="settings-card">
            <header className="sc-head">Security</header>
            <div className="sc-body">
              <div className="kv"><span>Sign-in</span><span>Admin account + one-time code</span></div>
              <div className="kv"><span>Session</span><span>8 hours, signs out after 30 min idle</span></div>
              <div className="kv"><span>Active sessions</span><span>{me.active_sessions}</span></div>
            </div>
            <footer className="sc-foot">
              <span className="muted small">Every sign-in, upload, download and reveal is logged.</span>
              <span className="row-actions">
                {me.can_view_audit && <button className="ghost-btn" onClick={onAudit}><ScrollText size={15} /> Audit log</button>}
                <button className="primary-btn sm" onClick={everywhere} disabled={busy}>Sign out everywhere</button>
              </span>
            </footer>
          </section>
        </div>

        <div className="settings-col">
          <section className="settings-card">
            <header className="sc-head">
              Voice
              {me.voice_enabled && (
                <label className="switch" title="Read answers aloud in voice mode">
                  <input type="checkbox" checked={speakAnswers} onChange={toggleSpeak} />
                  <span className="switch-track"><span className="switch-thumb" /></span>
                  <span className="switch-label">Read answers aloud</span>
                </label>
              )}
            </header>
            <div className="sc-body">
              {me.voice_enabled ? (
                <>
                  <p className="muted small voice-intro">Pick how Atlas sounds in voice mode. Press play to hear a short sample.</p>
                  {['female', 'male'].map((gender) => (
                    <div className="voice-group" key={gender}>
                      <div className="voice-group-label">{gender === 'female' ? "Women's voices" : "Men's voices"}</div>
                      <div className="voice-list">{VOICES.filter((v) => v.gender === gender).map(voiceRow)}</div>
                    </div>
                  ))}
                </>
              ) : (
                <span className="muted small">Voice isn't switched on for Ardena yet.</span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

const ACTION_LABELS = {
  sign_in: 'Signed in', sign_out: 'Signed out', sign_out_everywhere: 'Signed out everywhere',
  ask: 'Asked a question', upload: 'Uploaded', add_link: 'Added a link', read_document: 'Read document text',
  download: 'Downloaded', edit_document: 'Edited document', delete_document: 'Deleted document',
  reveal_fact: 'Revealed fact', create_fact: 'Added fact', update_fact: 'Changed fact', delete_fact: 'Deleted fact',
  restricted_fact_answered: 'Answer used a restricted fact', delete_conversation: 'Deleted a chat',
}

export function AuditPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [action, setAction] = useState('')
  const [more, setMore] = useState(false)

  const load = async (before) => {
    try {
      const page = await api.auditLog({ limit: 100, ...(action ? { action } : {}), ...(before ? { before_id: before } : {}) })
      setRows((r) => (before ? [...r, ...page] : page))
      setMore(page.length === 100)
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { setRows(null); load() }, [action]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>Audit log</h2><p className="muted">Everything people have done in Atlas, newest first.</p></div>
        <div className="audit-filter">
          <Select
            value={action}
            onChange={setAction}
            options={[{ value: '', label: 'All actions' }, ...Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v }))]}
          />
        </div>
      </div>
      {error && <div className="notice bad">{error}</div>}
      {!rows ? <TableSkeleton rows={8} badge={false} cols={3} /> : (
        <div className="table">
          <div className="tr th audit-row"><span>When</span><span>Who</span><span>What</span><span>Detail</span></div>
          {rows.map((r) => (
            <div key={r.id} className="tr audit-row">
              <span className="muted">{new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span>{r.admin_name || '—'}</span>
              <span>{ACTION_LABELS[r.action] || r.action}</span>
              <span className="muted small audit-detail">{r.target || ''}{r.ip_address ? ` · ${r.ip_address}` : ''}</span>
            </div>
          ))}
          {rows.length === 0 && <div className="empty">Nothing logged yet.</div>}
        </div>
      )}
      {more && <button className="ghost-btn" onClick={() => load(rows[rows.length - 1].id)}>Load more</button>}
    </div>
  )
}
