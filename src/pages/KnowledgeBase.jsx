import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Search, Trash2, ExternalLink, Plus, Lock, Loader2, AlertCircle, CheckCircle2, RotateCcw, ChevronRight } from 'lucide-react'
import { Icon, FileBadge } from '../components/Icon.jsx'
import DocViewer from '../components/DocViewer.jsx'
import * as api from '../lib/api.js'
import { formatDate, formatSize, useBrain } from '../lib/brain.jsx'

const ACCEPT = '.pdf,.docx,.pptx,.xlsx,.csv,.txt,.md'

function Status({ s }) {
  if (s === 'indexed') return <span className="status ok"><CheckCircle2 size={13} /> Indexed</span>
  if (s === 'failed') return <span className="status bad"><AlertCircle size={13} /> Failed</span>
  return <span className="status busy"><Loader2 size={13} className="spin" /> {s === 'queued' ? 'Queued' : 'Processing'}</span>
}

const pending = (d) => d.status === 'queued' || d.status === 'processing'

export default function KnowledgeBase({ group, setGroup, onAsk }) {
  const { groups, refreshMe } = useBrain()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [openId, setOpenId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [drag, setDrag] = useState(false)
  const [newLink, setNewLink] = useState('')
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(0)
  const input = useRef(null)

  const isAll = group === 'all'
  const isLinks = group === 'links'
  const g = groups.find((x) => x.key === group)
  const fileGroups = groups.filter((k) => k.key !== 'links')

  const load = useCallback(async () => {
    try {
      const res = await api.documents({ group: group && !isAll ? group : null })
      setDocs(res.documents)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [group, isAll])

  useEffect(() => { setLoading(true); load() }, [load])

  // While anything is being read, refresh every couple of seconds.
  const anyPending = docs.some(pending)
  useEffect(() => {
    if (!anyPending) return
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
  }, [anyPending, load])

  const upsert = (doc) => setDocs((d) => [doc, ...d.filter((x) => x.id !== doc.id)])

  const addFiles = async (fileList) => {
    const target = group && !isLinks && !isAll ? group : 'company'
    const files = [...fileList]
    setNotice('')
    setUploading((n) => n + files.length)
    const problems = []
    await Promise.all(files.map(async (f) => {
      try {
        upsert(await api.uploadDocument(f, target))
      } catch (e) {
        problems.push(`${f.name}: ${e.message}`)
      } finally {
        setUploading((n) => n - 1)
      }
    }))
    if (problems.length) setNotice(problems.join(' '))
    refreshMe()
  }

  const retry = async (id) => {
    try { upsert(await api.retryDocument(id)) } catch (e) { setNotice(e.message) }
  }

  const remove = async (id) => {
    const doc = docs.find((x) => x.id === id)
    if (!doc || !window.confirm(`Delete “${doc.title}” from the knowledge base? Brain will stop using it.`)) return
    try {
      await api.deleteDocument(id)
      setDocs((d) => d.filter((x) => x.id !== id))
      if (openId === id) setOpenId(null)
      refreshMe()
    } catch (e) {
      setNotice(e.message)
    }
  }

  const submitLink = async (e) => {
    e.preventDefault()
    if (!/^https?:\/\//.test(newLink.trim())) return setNotice('Links start with https:// or http://')
    setAdding(true)
    setNotice('')
    try {
      upsert(await api.addLink(newLink.trim(), 'links'))
      setNewLink('')
      refreshMe()
    } catch (err) {
      setNotice(err.message)
    } finally {
      setAdding(false)
    }
  }

  const files = docs.filter((d) => d.kind === 'file')
  const links = docs.filter((d) => d.kind === 'link')
  const visible = files
    .filter((d) => (isAll ? filter === 'all' || d.group === filter : !group || d.group === group))
    .filter((d) => d.title.toLowerCase().includes(q.toLowerCase()))
  const openDoc = docs.find((x) => x.id === openId)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{isAll ? 'All knowledge' : g ? g.name : 'Knowledge base'}</h2>
          <p className="muted">
            {isAll ? `Every document Brain can read across your ${fileGroups.length} groups. Click one to read it and see its status.`
              : g ? <><Lock size={13} /> Visible to: {g.audience}</> : 'Everything Brain knows. Uploads are read and searchable within a minute.'}
          </p>
        </div>
        {!isLinks && (
          <button className="primary-btn" onClick={() => input.current.click()} disabled={uploading > 0}>
            {uploading > 0 ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} Upload
          </button>
        )}
        <input ref={input} type="file" multiple hidden accept={ACCEPT} onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
      </div>

      {notice && <div className="notice" onClick={() => setNotice('')}>{notice}</div>}
      {error && <div className="notice bad">{error} <button className="link-btn" onClick={load}>Retry</button></div>}

      {isAll && (
        <div className="filter-row">
          {[{ key: 'all', name: 'All' }, ...fileGroups].map((k) => (
            <button key={k.key} className={`filter ${filter === k.key ? 'on' : ''}`} onClick={() => setFilter(k.key)}>
              {k.name} <span>{k.key === 'all' ? files.length : files.filter((d) => d.group === k.key).length}</span>
            </button>
          ))}
        </div>
      )}

      {!group && (
        <div className="group-grid">
          {groups.map((k) => (
            <button key={k.key} className="group-card" onClick={() => setGroup(k.key)}>
              <div className="group-icon"><Icon name={k.icon} size={18} /></div>
              <div className="group-name">{k.name}</div>
              <div className="muted small">{k.documents} {k.key === 'links' ? 'links' : 'documents'}</div>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty"><Loader2 size={18} className="spin" /></div>
      ) : isLinks ? (
        <>
          <form className="link-form" onSubmit={submitLink}>
            <input placeholder="https://… a page Brain should read and keep up to date" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
            <button className="primary-btn" type="submit" disabled={adding}>{adding ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Add link</button>
          </form>
          <div className="table">
            <div className="tr th"><span>Page</span><span>Last read</span><span>Status</span><span /></div>
            {links.map((l) => (
              <div className="tr clickable" key={l.id} onClick={() => setOpenId(l.id)}>
                <span className="doc-cell"><Icon name="Globe" size={16} /><span><div>{l.title}</div><div className="muted small">{l.url}</div></span></span>
                <span className="muted">{l.indexed_at ? formatDate(l.indexed_at) : '—'}</span>
                <span><Status s={l.status} /></span>
                <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                  {l.status === 'failed' && <button className="icon-btn sm" title="Retry" onClick={() => retry(l.id)}><RotateCcw size={15} /></button>}
                  <a className="icon-btn sm" href={l.url} target="_blank" rel="noreferrer" title="Open"><ExternalLink size={15} /></a>
                  {l.can_delete && <button className="icon-btn sm" title="Delete" onClick={() => remove(l.id)}><Trash2 size={15} /></button>}
                </span>
              </div>
            ))}
            {links.length === 0 && <div className="empty">No links yet. Add a page Brain should know about.</div>}
          </div>
        </>
      ) : (
        <>
          {!isAll && (
            <div
              className={`dropzone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
              onClick={() => input.current.click()}
            >
              <Upload size={20} />
              <div><strong>Drop PDF, Word, PowerPoint or Excel files</strong></div>
              <div className="muted small">They go to {g ? g.name : 'Company docs'}. Brain will cite them by page.</div>
            </div>
          )}

          <div className="table-tools">
            <div className="search-box"><Search size={15} /><input placeholder="Search documents" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <span className="muted small">{visible.length} documents</span>
          </div>

          <div className="table">
            <div className="tr th"><span>Document</span>{(!group || isAll) && <span>Group</span>}<span>Updated</span><span>Status</span><span /></div>
            {visible.map((d) => (
              <div className={`tr clickable ${!group || isAll ? 'wide' : ''}`} key={d.id} onClick={() => setOpenId(d.id)}>
                <span className="doc-cell">
                  <FileBadge type={d.type} />
                  <span><div>{d.title}</div><div className="muted small">{formatSize(d.size_bytes)} · {d.status === 'indexed' ? `${d.chunks} passages` : d.uploaded_by || '—'}</div></span>
                </span>
                {(!group || isAll) && <span className="muted">{d.group_name}</span>}
                <span className="muted">{formatDate(d.updated_at)}</span>
                <span><Status s={d.status} /></span>
                <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                  {d.status === 'failed' && <button className="icon-btn sm" title="Retry" onClick={() => retry(d.id)}><RotateCcw size={15} /></button>}
                  {d.can_delete && <button className="icon-btn sm" title="Delete" onClick={() => remove(d.id)}><Trash2 size={15} /></button>}
                  <ChevronRight size={15} className="row-go" />
                </span>
              </div>
            ))}
            {visible.length === 0 && <div className="empty">{q ? `Nothing matches “${q}”.` : 'No documents here yet. Drop some files above.'}</div>}
          </div>
        </>
      )}

      {openDoc && (
        <DocViewer
          key={openDoc.id}
          doc={openDoc}
          onClose={() => setOpenId(null)}
          onRetry={retry}
          onDelete={remove}
          onAsk={onAsk}
        />
      )}
    </div>
  )
}
