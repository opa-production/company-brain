import { useEffect, useState } from 'react'
import {
  X, CheckCircle2, Loader2, AlertCircle, Circle, Download, Trash2, RotateCcw, MessageSquareText, Lock, FileText,
} from 'lucide-react'
import { FileBadge } from './Icon.jsx'
import { kbGroups } from '../data/mock.js'
import { docPages } from '../data/docText.js'

export const STAGES = ['Uploaded', 'Extracting text', 'Splitting into passages', 'Embedding', 'Indexed']

const TEXT_TYPES = ['txt', 'md', 'csv']

// Opens a document: the reader on the left (the original file when we have it,
// otherwise the text Brain extracted) and its ingestion status on the right.
export default function DocViewer({ doc, onClose, onRetry, onDelete, onAsk }) {
  const hasOriginal = !!doc.url && (doc.type === 'pdf' || TEXT_TYPES.includes(doc.type))
  const [tab, setTab] = useState(hasOriginal ? 'original' : 'text')
  const [rawText, setRawText] = useState('')
  const group = kbGroups.find((g) => g.id === doc.group)

  useEffect(() => {
    if (doc.file && TEXT_TYPES.includes(doc.type)) doc.file.text().then(setRawText)
  }, [doc.file, doc.type])

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const stage = doc.status === 'indexed' ? STAGES.length - 1 : doc.stage ?? 1
  const pages = docPages(doc)

  return (
    <div className="viewer">
      <header className="viewer-head">
        <FileBadge type={doc.type} />
        <div className="viewer-title">
          <div>{doc.title}</div>
          <div className="muted small">{group?.name} · {doc.size}</div>
        </div>
        <div className="viewer-tabs">
          {hasOriginal && <button className={tab === 'original' ? 'on' : ''} onClick={() => setTab('original')}>Original</button>}
          <button className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>Text Brain reads</button>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close (Esc)"><X size={19} /></button>
      </header>

      <div className="viewer-body">
        <div className="reader">
          {tab === 'original' && doc.type === 'pdf' && <iframe className="reader-frame" src={doc.url} title={doc.title} />}
          {tab === 'original' && TEXT_TYPES.includes(doc.type) && <pre className="paper raw">{rawText}</pre>}
          {tab === 'text' && (
            <div className="pages">
              {!hasOriginal && (
                <div className="reader-note"><FileText size={14} /> Showing the extracted text. The original file opens here once storage is connected.</div>
              )}
              {doc.status !== 'indexed' && (
                <div className="reader-note warn">
                  {doc.status === 'failed' ? 'Text could not be extracted from this file.' : 'Still processing. Text appears as each step finishes.'}
                </div>
              )}
              {doc.status === 'indexed' && pages.map((p, i) => (
                <article key={i} className="paper">
                  <div className="paper-num">Page {i + 1}</div>
                  <h3>{p.heading}</h3>
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
                const failedHere = doc.status === 'failed' && i === (doc.stage ?? 1)
                const done = i < stage || (i === stage && doc.status === 'indexed')
                const active = i === stage && doc.status === 'processing'
                return (
                  <li key={s} className={done ? 'done' : active ? 'active' : failedHere ? 'failed' : ''}>
                    <span className="pl-icon">
                      {done ? <CheckCircle2 size={16} /> : active ? <Loader2 size={16} className="spin" /> : failedHere ? <AlertCircle size={16} /> : <Circle size={16} />}
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
            <div className="kv"><span>Group</span><span>{group?.name}</span></div>
            <div className="kv"><span>Type</span><span>{doc.type.toUpperCase()}</span></div>
            <div className="kv"><span>Size</span><span>{doc.size}</span></div>
            <div className="kv"><span>Added by</span><span>{doc.owner}</span></div>
            <div className="kv"><span>Updated</span><span>{doc.updated}</span></div>
            <div className="kv"><span>Visible to</span><span className="kv-lock"><Lock size={12} /> {group?.roles}</span></div>
          </section>

          <section className="ds-actions">
            <button className="primary-btn" disabled={doc.status !== 'indexed'} onClick={() => onAsk(`Summarise “${doc.title}”`)}>
              <MessageSquareText size={16} /> Ask Brain about this
            </button>
            <div className="ds-row">
              {doc.url ? (
                <a className="ghost-btn" href={doc.url} download={doc.title}><Download size={15} /> Download</a>
              ) : (
                <button className="ghost-btn" disabled title="Available once storage is connected"><Download size={15} /> Download</button>
              )}
              <button className="ghost-btn danger" onClick={() => onDelete(doc.id)}><Trash2 size={15} /> Delete</button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
