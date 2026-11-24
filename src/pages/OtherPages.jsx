import { useEffect, useState } from 'react'
import {
  Copy, Check, Eye, EyeOff, Lock, FileText, MessageSquare, Shield, AudioLines, UserRound, ShieldCheck, LogOut,
  SlidersHorizontal, Plus, Pencil, Trash2, Loader2, ScrollText,
} from 'lucide-react'
import { models, ROLE_LABELS, SPEAK_KEY } from '../config.js'
import * as api from '../lib/api.js'
import { useBrain } from '../lib/brain.jsx'

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

  return (
    <form className="fact-card fact-form" onSubmit={save}>
      <label className="field">Label<input value={f.label} onChange={set('label')} placeholder="KRA PIN" required /></label>
      <label className="field">Value<input value={f.value} onChange={set('value')} placeholder={f.restricted && !isNew ? 'Enter the value again to change it' : 'Exact value, copied from the certificate'} required /></label>
      <label className="field">Group
        <select value={f.group} onChange={set('group')} required>
          <option value="" disabled>Choose…</option>
          {groups.filter((g) => g.key !== 'links').map((g) => <option key={g.key} value={g.key}>{g.name}</option>)}
        </select>
      </label>
      <label className="field">Source<input value={f.source} onChange={set('source')} placeholder="KRA PIN certificate.pdf" /></label>
      <label className="toggle"><input type="checkbox" checked={f.restricted} onChange={set('restricted')} /> Restricted (masked until revealed)</label>
      {error && <div className="form-error">{error}</div>}
      <div className="ds-row">
        <button className="primary-btn" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : 'Save'}</button>
        <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export function FactsPage() {
  const { me, groups } = useBrain()
  const [facts, setFacts] = useState(null)
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
    if (!window.confirm(`Delete “${f.label}”? Brain will stop quoting it.`)) return
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
    return <div className="page"><div className="empty">{error || <Loader2 size={18} className="spin" />}</div></div>
  }

  const order = groups.map((g) => g.key)
  const present = [...new Set(facts.map((f) => f.group))].sort((a, b) => order.indexOf(a) - order.indexOf(b))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Company facts</h2>
          <p className="muted">Exact values Brain quotes word for word: registration numbers, PINs, certificates. Restricted values are masked, and every reveal is logged.</p>
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
          No company facts yet.{canEdit ? ' Add the registration number, KRA PIN and the like so Brain can quote them exactly.' : ' A super or general admin can add them.'}
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

export function HistoryPage({ chats, openChat, removeChat }) {
  return (
    <div className="page">
      <div className="page-head"><div><h2>History</h2><p className="muted">Your conversations. Only you can see them.</p></div></div>
      <div className="table">
        {chats.map((c) => (
          <div key={c.id} className="tr history-row clickable" onClick={() => openChat(c.id)}>
            <span className="doc-cell"><MessageSquare size={16} /> {c.title}</span>
            <span className="row-actions">
              <span className="muted">{c.day}</span>
              <button
                className="icon-btn sm"
                title="Delete chat"
                onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete “${c.title}”?`)) removeChat(c.id) }}
              >
                <Trash2 size={15} />
              </button>
            </span>
          </div>
        ))}
        {chats.length === 0 && <div className="empty">No conversations yet.</div>}
      </div>
    </div>
  )
}

export function SettingsPage({ onLogout, onLoggedOutEverywhere, model, setModel, onAudit }) {
  const { me } = useBrain()
  const user = me.user
  const [speakAnswers, setSpeakAnswers] = useState(() => localStorage.getItem(SPEAK_KEY) !== 'off')
  const [busy, setBusy] = useState(false)

  const toggleSpeak = () => {
    const next = !speakAnswers
    setSpeakAnswers(next)
    localStorage.setItem(SPEAK_KEY, next ? 'on' : 'off')
  }

  const everywhere = async () => {
    if (!window.confirm('Sign out of Ardena Brain on every device, including this one?')) return
    setBusy(true)
    try { await api.logoutEverywhere() } catch { /* signed out regardless */ }
    onLoggedOutEverywhere()
  }

  return (
    <div className="page narrow">
      <div className="page-head"><div><h2>Settings</h2><p className="muted">Your profile, how Brain answers, and your session.</p></div></div>

      <section className="settings-card">
        <header className="sc-head"><UserRound size={16} /> Profile</header>
        <div className="sc-body profile-row">
          <div className="avatar lg">{user.initials}</div>
          <div className="profile-text">
            <div className="profile-name">{user.name}</div>
            <div className="muted small">{user.email}</div>
          </div>
          <span className="role-tag"><ShieldCheck size={13} /> {ROLE_LABELS[user.role] || user.role}</span>
        </div>
        <footer className="sc-foot">
          <span className="muted small">Same account as the Ardena admin dashboard.</span>
          <button className="ghost-btn danger" onClick={onLogout}><LogOut size={15} /> Sign out</button>
        </footer>
      </section>

      <section className="settings-card">
        <header className="sc-head"><SlidersHorizontal size={16} /> Answers</header>
        <div className="sc-body">
          <div className="field">Default mode
            <div className="seg">
              {models.map((m) => (
                <button key={m.id} className={model === m.id ? 'on' : ''} onClick={() => setModel(m.id)}>{m.name}</button>
              ))}
            </div>
            <span className="muted small">{models.find((m) => m.id === model)?.hint}. The knowledge base is always used.</span>
          </div>
          <div className="kv"><span>Knowledge you can read</span><span>{me.groups.map((g) => g.name).join(', ')}</span></div>
        </div>
      </section>

      <section className="settings-card">
        <header className="sc-head"><AudioLines size={16} /> Voice</header>
        <div className="sc-body">
          {me.voice_enabled ? (
            <label className="toggle"><input type="checkbox" checked={speakAnswers} onChange={toggleSpeak} /> Read answers aloud in voice mode</label>
          ) : (
            <span className="muted small">Voice isn't switched on for Ardena yet.</span>
          )}
        </div>
      </section>

      <section className="settings-card">
        <header className="sc-head"><Shield size={16} /> Security</header>
        <div className="sc-body">
          <div className="kv"><span>Sign-in</span><span>Admin account + one-time code</span></div>
          <div className="kv"><span>Session</span><span>8 hours, signs out after 30 min idle</span></div>
          <div className="kv"><span>Active sessions</span><span>{me.active_sessions}</span></div>
        </div>
        <footer className="sc-foot">
          <span className="muted small">Every sign-in, upload, download and reveal is logged.</span>
          <span className="row-actions">
            {me.can_view_audit && <button className="ghost-btn" onClick={onAudit}><ScrollText size={15} /> Audit log</button>}
            <button className="ghost-btn" onClick={everywhere} disabled={busy}>Sign out everywhere</button>
          </span>
        </footer>
      </section>
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
        <div><h2>Audit log</h2><p className="muted">Everything people have done in Brain, newest first.</p></div>
        <select className="audit-filter" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {error && <div className="notice bad">{error}</div>}
      {!rows ? <div className="empty"><Loader2 size={18} className="spin" /></div> : (
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
