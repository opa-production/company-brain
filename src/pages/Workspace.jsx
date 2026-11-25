import { useEffect, useRef, useState } from 'react'
import {
  Plus, Pencil, Trash2, Copy, Check, ExternalLink, Upload, X, AlertCircle, CheckCircle2, ChevronRight,
  Instagram, Linkedin, Facebook, Twitter, Youtube, Globe, MessageCircle, Music2, Mail, AtSign,
} from 'lucide-react'
import { FileBadge } from '../components/Icon.jsx'
import DocViewer from '../components/DocViewer.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Select from '../components/Select.jsx'
import Loader from '../components/Loader.jsx'
import { TableSkeleton } from '../components/Skeletons.jsx'
import { departments, SOCIAL_PLATFORMS } from '../config.js'
import * as api from '../lib/api.js'
import { pageCache } from '../lib/cache.js'
import { formatDate, formatSize, useBrain } from '../lib/brain.jsx'

const PLATFORM_ICON = { website: Globe, instagram: Instagram, linkedin: Linkedin, facebook: Facebook, x: Twitter, youtube: Youtube, tiktok: Music2, whatsapp: MessageCircle, email: Mail, other: AtSign }
const platformOf = (key) => SOCIAL_PLATFORMS.find((p) => p.key === key) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1]
const notReady = (e) => e?.status === 404 || e?.status === 405

// ===================================================================== socials

function SocialForm({ initial, onCancel, onSave }) {
  const [f, setF] = useState(initial || { platform: 'instagram', handle: '', url: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e })

  const submit = async (e) => {
    e.preventDefault()
    const url = f.url.trim()
    if (!url) return setError('Add the link.')
    if (f.platform !== 'email' && !/^https?:\/\//.test(url)) return setError('Links start with https://')
    setBusy(true)
    setError('')
    try { await onSave({ ...f, url, handle: f.handle.trim() }) } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <form className="fact-card fact-form social-form" onSubmit={submit}>
      <div className="ff-head">
        <span className="ff-title">{initial ? 'Edit account' : 'Add an account'}</span>
        <button type="button" className="icon-btn sm" onClick={onCancel} title="Cancel"><X size={15} /></button>
      </div>
      <div className="ff-row">
        <div className="field">Platform
          <Select value={f.platform} onChange={set('platform')} options={SOCIAL_PLATFORMS.map((p) => ({ value: p.key, label: p.name }))} />
        </div>
        <label className="field">Handle or name
          <input value={f.handle} onChange={set('handle')} placeholder="@ardena.ke" />
        </label>
      </div>
      <label className="field">{f.platform === 'email' ? 'Email address' : 'Link'}
        <input value={f.url} onChange={set('url')} placeholder={f.platform === 'email' ? 'hello@ardena.co.ke' : 'https://instagram.com/ardena.ke'} />
      </label>
      {error && <div className="form-error">{error}</div>}
      <div className="ff-foot">
        <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
        <button className="primary-btn" disabled={busy}>{busy ? <Loader size={16} tone="light" /> : 'Save'}</button>
      </div>
    </form>
  )
}

function SocialCard({ s, canEdit, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false)
  const p = platformOf(s.platform)
  const I = PLATFORM_ICON[p.key] || AtSign
  const href = s.platform === 'email' && !s.url.startsWith('mailto:') ? `mailto:${s.url}` : s.url
  const shown = s.url.replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  return (
    <div className="fact-card social-card">
      <div className="social-top">
        <span className="social-icon"><I size={18} strokeWidth={1.8} /></span>
        <div className="social-who">
          <div className="social-platform">{p.name}</div>
          <div className="social-handle">{s.handle || shown}</div>
        </div>
      </div>
      <div className="fact-foot">
        <a className="social-link muted small" href={href} target="_blank" rel="noreferrer" title={s.url}>{shown}</a>
        <span className="row-actions">
          <button className="icon-btn sm" title={copied ? 'Copied' : 'Copy link'} onClick={() => { navigator.clipboard?.writeText(s.url.replace(/^mailto:/, '')); setCopied(true); setTimeout(() => setCopied(false), 1400) }}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <a className="icon-btn sm" href={href} target="_blank" rel="noreferrer" title="Open"><ExternalLink size={15} /></a>
          {canEdit && <button className="icon-btn sm" title="Edit" onClick={onEdit}><Pencil size={15} /></button>}
          {canEdit && <button className="icon-btn sm" title="Delete" onClick={onDelete}><Trash2 size={15} /></button>}
        </span>
      </div>
    </div>
  )
}

export function SocialsPage() {
  const { me } = useBrain()
  const canEdit = me.can_manage_socials ?? me.can_manage_facts
  const [rows, setRows] = useState(() => pageCache.get('socials') || null)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  const [editing, setEditing] = useState(null) // null | 'new' | id

  useEffect(() => {
    api.socials()
      .then((r) => { setRows(r.socials); pageCache.set('socials', r.socials) })
      .catch((e) => { if (notReady(e)) { setUnavailable(true); setRows([]) } else setError(e.message) })
  }, [])

  const save = async (data) => {
    const saved = editing === 'new' ? await api.addSocial(data) : await api.updateSocial(editing, data)
    setRows((rs) => {
      const next = editing === 'new' ? [...rs, saved] : rs.map((r) => (r.id === saved.id ? saved : r))
      pageCache.set('socials', next)
      return next
    })
    setEditing(null)
  }

  const remove = async (s) => {
    if (!window.confirm(`Remove ${platformOf(s.platform).name} (${s.handle || s.url})?`)) return
    try {
      await api.deleteSocial(s.id)
      setRows((rs) => rs.filter((r) => r.id !== s.id))
    } catch (e) { setError(e.message) }
  }

  const order = (a, b) => SOCIAL_PLATFORMS.findIndex((p) => p.key === a.platform) - SOCIAL_PLATFORMS.findIndex((p) => p.key === b.platform)

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>Company socials</h2><p className="muted">Ardena's official accounts and links in one place. Atlas uses these when someone asks for them.</p></div>
        {canEdit && !unavailable && editing !== 'new' && <button className="primary-btn" onClick={() => setEditing('new')}><Plus size={16} /> Add account</button>}
      </div>
      {error && <div className="notice bad">{error}</div>}
      {unavailable && <div className="notice">Company socials aren't switched on yet. They'll appear here once the server is updated.</div>}
      {!rows ? <TableSkeleton rows={4} badge={false} /> : (
        <div className="facts-grid">
          {editing === 'new' && <SocialForm onCancel={() => setEditing(null)} onSave={save} />}
          {[...rows].sort(order).map((s) => (editing === s.id
            ? <SocialForm key={s.id} initial={s} onCancel={() => setEditing(null)} onSave={save} />
            : <SocialCard key={s.id} s={s} canEdit={canEdit} onEdit={() => setEditing(s.id)} onDelete={() => remove(s)} />))}
        </div>
      )}
      {rows && rows.length === 0 && !unavailable && editing !== 'new' && (
        <EmptyState
          title="No accounts yet"
          text={canEdit ? 'Add the website, Instagram, LinkedIn and the rest so everyone links to the right place.' : 'A super or general admin can add them.'}
          action={canEdit && <button className="primary-btn" onClick={() => setEditing('new')}><Plus size={16} /> Add account</button>}
        />
      )}
    </div>
  )
}

// ===================================================================== reports

const ACCEPT = '.pdf,.docx,.pptx,.xlsx,.csv,.txt,.md'
const thisMonth = () => new Date().toISOString().slice(0, 7)
const periodLabel = (p) => (p ? new Date(`${p}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—')
const deptName = (k) => departments.find((d) => d.key === k)?.name || k

function ReportStatus({ s }) {
  if (s === 'indexed') return <span className="status ok"><CheckCircle2 size={13} /> Ready</span>
  if (s === 'failed') return <span className="status bad"><AlertCircle size={13} /> Failed</span>
  return <span className="status busy"><Loader size={13} /> Reading</span>
}

function UploadReport({ onDone, onCancel }) {
  const [file, setFile] = useState(null)
  const [dept, setDept] = useState(departments[0].key)
  const [period, setPeriod] = useState(thisMonth())
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const input = useRef(null)

  const pick = (f) => {
    if (!f) return
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return setError('Choose the report file.')
    setError('')
    setProgress(0)
    try {
      onDone(await api.uploadReport({ file, department: dept, period, title: title.trim() || null }, setProgress))
    } catch (err) {
      setError(err.message)
      setProgress(null)
    }
  }

  const ext = file?.name.includes('.') ? file.name.split('.').pop() : 'file'
  return (
    <form className="settings-card report-form" onSubmit={submit}>
      <header className="sc-head">Upload a report<button type="button" className="icon-btn sm" style={{ marginLeft: 'auto' }} onClick={onCancel} title="Close"><X size={15} /></button></header>
      <div className="sc-body">
        <div className={`dropzone report-drop ${file ? 'has-file' : ''}`} onClick={() => input.current.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}>
          <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => pick(e.target.files[0])} />
          {file ? (
            <span className="doc-cell"><FileBadge type={ext} /><span><div>{file.name}</div><div className="muted small">{formatSize(file.size)} · click to change</div></span></span>
          ) : (
            <><Upload size={20} /><div><b>Choose a file</b> or drop it here</div><div className="muted small">PDF, Word, PowerPoint, Excel or CSV</div></>
          )}
        </div>
        <div className="ff-row">
          <div className="field">Department
            <Select value={dept} onChange={setDept} options={departments.map((d) => ({ value: d.key, label: d.name }))} />
          </div>
          <label className="field">Month it covers
            <input type="month" value={period} max={thisMonth()} onChange={(e) => setPeriod(e.target.value)} />
          </label>
        </div>
        <label className="field">Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finance monthly report" />
        </label>
        {error && <div className="form-error">{error}</div>}
        {progress !== null && <div className="report-progress"><span style={{ transform: `scaleX(${progress})` }} /></div>}
      </div>
      <footer className="sc-foot">
        <span className="muted small">Atlas reads it in about a minute and can then answer from it.</span>
        <span className="row-actions">
          <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
          <button className="primary-btn" disabled={progress !== null}>{progress !== null ? <Loader size={16} tone="light" /> : 'Upload'}</button>
        </span>
      </footer>
    </form>
  )
}

export function ReportsPage({ onAsk }) {
  const [rows, setRows] = useState(() => pageCache.get('reports') || null)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  const [dept, setDept] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(null)

  const load = () => api.reports()
    .then((r) => { setRows(r.reports); pageCache.set('reports', r.reports); setError('') })
    .catch((e) => { if (notReady(e)) { setUnavailable(true); setRows([]) } else setError(e.message) })
  useEffect(() => { load() }, [])

  // Refresh while any report is still being read.
  const reading = rows?.some((r) => r.status === 'queued' || r.status === 'processing')
  useEffect(() => {
    if (!reading) return
    const t = setInterval(load, 2500)
    return () => clearInterval(t)
  }, [reading])

  const openReport = async (r) => {
    try { setOpen(await api.getDocument(r.document_id)) } catch (e) { setError(e.message) }
  }
  const remove = async (r) => {
    if (!window.confirm(`Delete “${r.title}”? Atlas will stop using it.`)) return
    try {
      await api.deleteReport(r.id)
      setRows((rs) => rs.filter((x) => x.id !== r.id))
      if (open?.id === r.document_id) setOpen(null)
    } catch (e) { setError(e.message) }
  }

  const counts = Object.fromEntries(departments.map((d) => [d.key, rows?.filter((r) => r.department === d.key).length || 0]))
  const shown = (rows || []).filter((r) => dept === 'all' || r.department === dept)

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>Department reports</h2><p className="muted">Monthly reports from department heads. Atlas reads each one, so you can ask about them in chat.</p></div>
        {!unavailable && !uploading && <button className="primary-btn" onClick={() => setUploading(true)}><Upload size={16} /> Upload report</button>}
      </div>
      {error && <div className="notice bad">{error}</div>}
      {unavailable && <div className="notice">Department reports aren't switched on yet. They'll appear here once the server is updated.</div>}
      {uploading && (
        <UploadReport
          onCancel={() => setUploading(false)}
          onDone={(r) => { setUploading(false); setRows((rs) => [r, ...(rs || [])]) }}
        />
      )}

      {rows && rows.length > 0 && (
        <div className="filter-row">
          <button className={`filter ${dept === 'all' ? 'on' : ''}`} onClick={() => setDept('all')}>All <span>{rows.length}</span></button>
          {departments.filter((d) => counts[d.key]).map((d) => (
            <button key={d.key} className={`filter ${dept === d.key ? 'on' : ''}`} onClick={() => setDept(d.key)}>{d.name} <span>{counts[d.key]}</span></button>
          ))}
        </div>
      )}

      {!rows ? <TableSkeleton rows={5} cols={3} /> : shown.length > 0 ? (
        <div className="table">
          <div className="tr th report-row"><span>Report</span><span>Department</span><span>Month</span><span>Status</span><span /></div>
          {shown.map((r) => (
            <div key={r.id} className="tr report-row clickable" onClick={() => openReport(r)}>
              <span className="doc-cell">
                <FileBadge type={r.type} />
                <span><div>{r.title}</div><div className="muted small">{r.uploaded_by ? `${r.uploaded_by} · ` : ''}{formatDate(r.created_at)}</div></span>
              </span>
              <span className="muted">{deptName(r.department)}</span>
              <span className="muted">{periodLabel(r.period)}</span>
              <span><ReportStatus s={r.status} /></span>
              <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                {r.can_delete !== false && <button className="icon-btn sm" title="Delete" onClick={() => remove(r)}><Trash2 size={15} /></button>}
                <ChevronRight size={15} className="row-go" />
              </span>
            </div>
          ))}
        </div>
      ) : !unavailable && !uploading && (
        <EmptyState
          title={rows.length ? 'No reports for this department' : 'No reports yet'}
          text="Department heads upload their monthly report here. Atlas reads it and can summarise or compare reports in chat."
          action={<button className="primary-btn" onClick={() => setUploading(true)}><Upload size={16} /> Upload report</button>}
        />
      )}

      {open && (
        <DocViewer
          doc={open}
          onClose={() => setOpen(null)}
          onRetry={async (id, opts) => { try { setOpen(await api.retryDocument(id, opts)); load() } catch (e) { setError(e.message) } }}
          onDelete={() => { const r = rows.find((x) => x.document_id === open.id); if (r) remove(r) }}
          onAsk={onAsk}
        />
      )}
    </div>
  )
}
