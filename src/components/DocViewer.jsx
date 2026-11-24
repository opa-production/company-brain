import { useEffect, useState } from 'react'
import {
  X, CheckCircle2, AlertCircle, Circle, Download, Trash2, RotateCcw, MessageSquareText, Lock, FileText, ExternalLink,
} from 'lucide-react'
import { FileBadge } from './Icon.jsx'
import * as api from '../lib/api.js'
import { formatDate, formatSize, useBrain } from '../lib/brain.jsx'
import Loader, { LoaderBlock } from './Loader.jsx'
import { PagesSkeleton } from './Skeletons.jsx'

// The server's ingestion stages, in order (app/brain/ingest.py).
export const STAGES = ['Uploaded', 'Extracting text', 'Splitting into passages', 'Indexing', 'Indexed']

// Opens a document: the reader on the left (the original PDF when there is
// one, otherwise the text Brain extracted) and its ingestion status on the right.
export default function DocViewer({ doc, onClose, onRetry, onDelete, onAsk }) {
  const { groups } = useBrain()
  const isPdf = doc.kind === 'file' && doc.type === 'pdf'
  const [tab, setTab] = useState(isPdf && doc.status === 'indexed' ? 'original' : 'text')
  const [pages, setPages] = useState(null)
  const [textError, setTextError] = useState('')
  const [originalUrl, setOriginalUrl] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const group = groups.find((g) => g.key === doc.group)

  useEffect(() => {
    if (doc.status !== 'indexed') return
    api.documentText(doc.id).then((r) => setPages(r.pages)).catch((e) => setTextError(e.message))
  }, [doc.id, doc.status])

  useEffect(() => {
    if (tab !== 'original' || !isPdf || originalUrl) return
    api.downloadLink(doc.id).then((r) => setOriginalUrl(r.url)).catch((e) => setTextError(e.message))
  }, [tab, isPdf, doc.id, originalUrl])

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const download = async () => {
    setDownloading(true)
    try {
      const { url } = await api.downloadLink(doc.id)
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      setTextError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  const stage = doc.status === 'indexed' ? STAGES.length - 1 : doc.stage ?? 0
  const unit = doc.type === 'pptx' ? 'Slide' : doc.type === 'xlsx' ? 'Sheet' : 'Page'

  return (
    <div className="viewer">
      <header className="viewer-head">
        <FileBadge type={doc.kind === 'link' ? 'web' : doc.type} />
        <div className="viewer-title">
          <div>{doc.title}</div>
          <div className="muted small">{group?.name || doc.group_name} · {doc.kind === 'link' ? doc.url : formatSize(doc.size_bytes)}</div>
        </div>
        <div className="viewer-tabs">
          {isPdf && <button className={tab === 'original' ? 'on' : ''} onClick={() => setTab('original')}>Original</button>}
          <button className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>Text Brain reads</button>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close (Esc)"><X size={19} /></button>
      </header>

      <div className="viewer-body">
        <div className="reader">
          {tab === 'original' && isPdf && (
            originalUrl
              ? <iframe className="reader-frame" src={originalUrl} title={doc.title} />
              : <LoaderBlock label="Opening the file" />
          )}
          {tab === 'text' && (
            <div className="pages">
              {textError && <div className="reader-note warn">{textError}</div>}
              {doc.status !== 'indexed' && (
                <div className="reader-note warn">
                  {doc.status === 'failed' ? 'Text could not be extracted from this file.' : 'Still processing. The text appears here once it is indexed.'}
                </div>
              )}
              {doc.status === 'indexed' && !pages && !textError && <PagesSkeleton />}
              {pages && pages.length === 0 && <div className="reader-note"><FileText size={14} /> No text was found.</div>}
              {pages && pages.map((p) => (
                <article key={p.ordinal} className="paper">
                  {p.page && <div className="paper-num">{unit} {p.page}</div>}
                  {p.heading && <h3>{p.heading}</h3>}
                  {p.text.split('\n').map((l, j) => (l ? <p key={j}>{l}</p> : <br key={j} />))}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="doc-status">
          <section>
            <div className="ds-label">Status</div>
            <ol className="pipeline">
              {STAGES.map((s, i) => {
                const failedHere = doc.status === 'failed' && i === Math.max(1, doc.stage ?? 1)
                const done = i < stage || (i === stage && doc.status === 'indexed')
                const active = i === stage && (doc.status === 'processing' || doc.status === 'queued')
                return (
                  <li key={s} className={done ? 'done' : active ? 'active' : failedHere ? 'failed' : ''}>
                    <span className="pl-icon">
                      {done ? <CheckCircle2 size={16} /> : active ? <Loader size={16} /> : failedHere ? <AlertCircle size={16} /> : <Circle size={16} />}
                    </span>
                    <span>
                      {s}
                      {failedHere && <span className="pl-err">{doc.error || 'Something went wrong.'}</span>}
                      {s === 'Indexed' && done && <span className="pl-sub">{doc.chunks} passages searchable</span>}
                    </span>
                  </li>
                )
              })}
            </ol>
            {doc.status === 'failed' && (
              <button className="ghost-btn full" onClick={() => onRetry(doc.id)}><RotateCcw size={15} /> Retry</button>
            )}
          </section>

          <section>
            <div className="ds-label">Details</div>
            <div className="kv"><span>Group</span><span>{group?.name || doc.group_name}</span></div>
            <div className="kv"><span>Type</span><span>{doc.kind === 'link' ? 'Web page' : (doc.type || '').toUpperCase()}</span></div>
            {doc.kind === 'file' && <div className="kv"><span>Size</span><span>{formatSize(doc.size_bytes)}</span></div>}
            {doc.pages ? <div className="kv"><span>{unit}s</span><span>{doc.pages}</span></div> : null}
            <div className="kv"><span>Added by</span><span>{doc.uploaded_by || '—'}</span></div>
            <div className="kv"><span>Updated</span><span>{formatDate(doc.updated_at)}</span></div>
            <div className="kv"><span>Visible to</span><span className="kv-lock"><Lock size={12} /> {group?.audience}</span></div>
          </section>

          <section className="ds-actions">
            <button className="primary-btn" disabled={doc.status !== 'indexed'} onClick={() => { onClose(); onAsk(`Summarise “${doc.title}”`) }}>
              <MessageSquareText size={16} /> Ask Brain about this
            </button>
            <div className="ds-row">
              {doc.kind === 'link' ? (
                <a className="ghost-btn" href={doc.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open page</a>
              ) : (
                <button className="ghost-btn" onClick={download} disabled={downloading}>
                  {downloading ? <Loader size={15} /> : <Download size={15} />} Download
                </button>
              )}
              {doc.can_delete && <button className="ghost-btn danger" onClick={() => onDelete(doc.id)}><Trash2 size={15} /> Delete</button>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
