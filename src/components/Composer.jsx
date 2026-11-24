import { useEffect, useRef, useState } from 'react'
import { Paperclip, AudioLines, ArrowUp, Square, X, ChevronDown, Check } from 'lucide-react'
import { FileBadge, Icon } from './Icon.jsx'
import { models } from '../data/mock.js'

const ext = (n) => (n.includes('.') ? n.split('.').pop() : 'file')
const kb = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function ModePicker({ model, setModel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  const cur = models.find((m) => m.id === model) || models[0]

  return (
    <div className="dropdown" ref={ref}>
      <button className="mode-btn" onClick={() => setOpen((o) => !o)} title="Answer mode">
        <Icon name={cur.icon} size={15} />
        {cur.name}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="menu up">
          <div className="menu-cap">Mode</div>
          {models.map((m) => (
            <button key={m.id} className="menu-item" onClick={() => { setModel(m.id); setOpen(false) }}>
              <Icon name={m.icon} size={16} />
              <div className="menu-grow">
                <div className="menu-title">{m.name}</div>
                <div className="menu-hint">{m.hint}</div>
              </div>
              {m.id === model && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Composer({ onSend, onStop, busy, onVoice, compact, model, setModel, placeholder }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const ta = useRef(null)
  const fileInput = useRef(null)

  useEffect(() => {
    if (!ta.current) return
    ta.current.style.height = 'auto'
    ta.current.style.height = Math.min(ta.current.scrollHeight, 200) + 'px'
  }, [text])

  const send = () => {
    const t = text.trim()
    if (!t || busy) return
    onSend(t, { files })
    setText('')
    setFiles([])
  }

  return (
    <div className={`composer ${compact ? 'compact' : ''}`}>
      {files.length > 0 && (
        <div className="attached">
          {files.map((f, i) => (
            <span key={i} className="attached-file">
              <FileBadge type={ext(f.name)} size="sm" />
              <span className="af-text">
                <span className="af-name">{f.name}</span>
                <span className="af-meta">{ext(f.name).toUpperCase()} · {kb(f.size)}</span>
              </span>
              <button className="af-x" title="Remove" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <textarea
        ref={ta}
        rows={compact ? 1 : 2}
        placeholder={placeholder || 'Ask anything about Ardena'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
          }
        }}
      />
      <div className="composer-row">
        <div className="composer-tools">
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => { setFiles([...files, ...e.target.files]); e.target.value = '' }} />
          <button className="tool-btn" onClick={() => fileInput.current.click()} title="Attach files"><Paperclip size={17} /></button>
          <ModePicker model={model} setModel={setModel} />
        </div>
        {busy ? (
          <button className="send-btn stop" onClick={onStop} title="Stop"><Square size={13} fill="currentColor" /></button>
        ) : text.trim() ? (
          <button className="send-btn" onClick={send} title="Send"><ArrowUp size={18} /></button>
        ) : (
          <button className="voice-btn" onClick={onVoice} title="Voice mode"><AudioLines size={17} /> Voice</button>
        )}
      </div>
    </div>
  )
}
