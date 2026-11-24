import { useEffect, useRef, useState } from 'react'
import { Upload, Search, Trash2, ExternalLink, Plus, Lock, Loader2, AlertCircle, CheckCircle2, RotateCcw, ChevronRight } from 'lucide-react'
import { Icon, FileBadge } from '../components/Icon.jsx'
import DocViewer, { STAGES } from '../components/DocViewer.jsx'
import { kbGroups, documents as rawDocs, links as seedLinks } from '../data/mock.js'

// Seeded docs get an ingestion stage so the status panel has something to show.
const seedDocs = rawDocs.map((d) =>
  d.status === 'processing' ? { ...d, stage: 3 }
    : d.status === 'failed' ? { ...d, stage: 1, error: 'Scanned PDF with no text layer. OCR could not read it.' }
      : d,
)

const extOf = (name) => (name.split('.').pop() || 'file').toLowerCase()

function Status({ s }) {
  if (s === 'indexed') return <span className="status ok"><CheckCircle2 size={13} /> Indexed</span>
  if (s === 'processing') return <span className="status busy"><Loader2 size={13} className="spin" /> Processing</span>
  return <span className="status bad"><AlertCircle size={13} /> Failed</span>
}

export default function KnowledgeBase({ group, setGroup, onAsk }) {
  const [docs, setDocs] = useState(seedDocs)
  const [openId, setOpenId] = useState(null)
  const [filter, setFilter] = useState('all')
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const [links, setLinks] = useState(seedLinks)
  const [q, setQ] = useState('')
  const [drag, setDrag] = useState(false)
  const [newLink, setNewLink] = useState('')
  const input = useRef(null)

  const isAll = group === 'all'
  const g = kbGroups.find((x) => x.id === group)
  const isLinks = group === 'links'

  // Walk a document through the ingestion stages, then mark it indexed.
  const runPipeline = (id) => {
    for (let st = 1; st < STAGES.length; st++) {
      timers.current.push(setTimeout(() => {
        setDocs((d) => d.map((x) => {
          if (x.id !== id) return x
          return st === STAGES.length - 1
            ? { ...x, status: 'indexed', stage: st, chunks: x.chunks || 5 + Math.floor(Math.random() * 30) }
            : { ...x, status: 'processing', stage: st }
        }))
      }, st * (900 + Math.random() * 500)))
    }
  }

  const addFiles = (fileList) => {
    const target = group && !isLinks && !isAll ? group : 'company'
    const added = [...fileList].map((f, i) => ({
      id: `u${Date.now()}${i}`,
      group: target,
      title: f.name,
      type: extOf(f.name),
      size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
      updated: 'Just now',
      status: 'processing',
      stage: 0,
      chunks: 0,
      owner: 'You',
      file: f,
      url: URL.createObjectURL(f),
    }))
    setDocs((d) => [...added, ...d])
    added.forEach((a) => runPipeline(a.id))
  }

  const retry = (id) => {
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, status: 'processing', stage: 1, error: null } : x)))
    runPipeline(id)
  }

  const remove = (id) => {
    const doc = docs.find((x) => x.id === id)
    if (doc?.url) URL.revokeObjectURL(doc.url)
    setDocs((d) => d.filter((x) => x.id !== id))
    if (openId === id) setOpenId(null)
  }

  const visible = docs
    .filter((d) => (isAll ? filter === 'all' || d.group === filter : !group || d.group === group))
    .filter((d) => d.title.toLowerCase().includes(q.toLowerCase()))

  const counts = Object.fromEntries(kbGroups.map((k) => [k.id, k.id === 'links' ? links.length : docs.filter((d) => d.group === k.id).length]))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{isAll ? 'All knowledge' : g ? g.name : 'Knowledge base'}</h2>
          <p className="muted">
            {isAll ? `Every document Brain can read, across all ${kbGroups.length - 1} groups. Click one to read it and see its status.`
              : g ? <><Lock size={13} /> Visible to: {g.roles}</> : 'Everything Brain knows. Uploads are split, embedded and searchable within a minute.'}
          </p>
        </div>
        {!isLinks && (
          <button className="primary-btn" onClick={() => input.current.click()}><Upload size={16} /> Upload</button>
        )}
        <input ref={input} type="file" multiple hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {isAll && (
        <div className="filter-row">
          {[{ id: 'all', name: 'All' }, ...kbGroups.filter((k) => k.id !== 'links')].map((k) => (
            <button key={k.id} className={`filter ${filter === k.id ? 'on' : ''}`} onClick={() => setFilter(k.id)}>
              {k.name} <span>{k.id === 'all' ? docs.length : counts[k.id]}</span>
            </button>
          ))}
        </div>
      )}

      {!group && (
        <div className="group-grid">
          {kbGroups.map((k) => (
            <button key={k.id} className="group-card" onClick={() => setGroup(k.id)}>
              <div className="group-icon"><Icon name={k.icon} size={18} /></div>
              <div className="group-name">{k.name}</div>
              <div className="muted small">{counts[k.id]} {k.id === 'links' ? 'links' : 'documents'}</div>
            </button>
          ))}
        </div>
      )}

      {isLinks ? (
        <>
          <form
            className="link-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!/^https?:\/\//.test(newLink)) return
              setLinks([{ id: `l${Date.now()}`, title: newLink.replace(/^https?:\/\//, ''), url: newLink, crawled: 'Crawling…', status: 'processing' }, ...links])
              setNewLink('')
            }}
          >
            <input placeholder="https://… a page Brain should read and keep up to date" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
            <button className="primary-btn" type="submit"><Plus size={16} /> Add link</button>
          </form>
          <div className="table">
            <div className="tr th"><span>Page</span><span>Last crawled</span><span>Status</span><span /></div>
            {links.map((l) => (
              <div className="tr" key={l.id}>
                <span className="doc-cell"><Icon name="Globe" size={16} /><span><div>{l.title}</div><div className="muted small">{l.url}</div></span></span>
                <span className="muted">{l.crawled}</span>
                <span><Status s={l.status} /></span>
                <span className="row-actions">
                  <a className="icon-btn sm" href={l.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a>
                  <button className="icon-btn sm" onClick={() => setLinks(links.filter((x) => x.id !== l.id))}><Trash2 size={15} /></button>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {!isAll && <div
            className={`dropzone ${drag ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
            onClick={() => input.current.click()}
          >
            <Upload size={20} />
            <div><strong>Drop Word, PDF, PowerPoint or Excel files</strong></div>
            <div className="muted small">They go to {g && !isLinks ? g.name : 'Company docs'}. Brain will cite them by page.</div>
          </div>}

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
                  <span><div>{d.title}</div><div className="muted small">{d.size} · {d.status === 'indexed' ? `${d.chunks} passages` : d.owner}</div></span>
                </span>
                {(!group || isAll) && <span className="muted">{kbGroups.find((k) => k.id === d.group)?.name}</span>}
                <span className="muted">{d.updated}</span>
                <span><Status s={d.status} /></span>
                <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                  {d.status === 'failed' && <button className="icon-btn sm" title="Retry" onClick={() => retry(d.id)}><RotateCcw size={15} /></button>}
                  <button className="icon-btn sm" title="Delete" onClick={() => remove(d.id)}><Trash2 size={15} /></button>
                  <ChevronRight size={15} className="row-go" />
                </span>
              </div>
            ))}
            {visible.length === 0 && <div className="empty">No documents here yet. Drop some files above.</div>}
          </div>
        </>
      )}

      {openId && docs.find((x) => x.id === openId) && (
        <DocViewer
          key={openId}
          doc={docs.find((x) => x.id === openId)}
          onClose={() => setOpenId(null)}
          onRetry={retry}
          onDelete={remove}
          onAsk={onAsk}
        />
      )}
    </div>
  )
}
