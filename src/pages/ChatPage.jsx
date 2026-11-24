import { useEffect, useRef, useState } from 'react'
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import Composer from '../components/Composer.jsx'
import Orb from '../components/Orb.jsx'
import { Icon } from '../components/Icon.jsx'
import { Markdown } from '../lib/markdown.jsx'
import { suggestions } from '../data/mock.js'

function Working({ label }) {
  return (
    <div className="working">
      <span className="spark" />
      <span className="shimmer">{label}…</span>
    </div>
  )
}

function ThoughtFor({ msg }) {
  const [open, setOpen] = useState(false)
  if (!msg.steps?.length) return null
  const secs = Math.max(1, Math.round((msg.finishedAt - msg.startedAt) / 1000))
  return (
    <div className="thought">
      <button className="thought-btn" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {msg.status === 'stopped' ? 'Stopped' : `Thought for ${secs}s`}
      </button>
      {open && (
        <ol className="thought-steps">
          {msg.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
    </div>
  )
}

function AssistantMessage({ msg, onRetry }) {
  const [copied, setCopied] = useState(false)
  const [vote, setVote] = useState(null)
  const working = msg.status === 'working'
  const done = msg.status === 'done' || msg.status === 'stopped'

  return (
    <div className="msg assistant">
      <Orb size={34} state={working || msg.status === 'streaming' ? 'busy' : 'idle'} />
      <div className="msg-body">
        {!working && <ThoughtFor msg={msg} />}
        {working && <Working label={msg.steps[msg.steps.length - 1] || 'Thinking'} />}
        {msg.content && <Markdown text={msg.content} />}
        {msg.status === 'streaming' && <span className="caret-blink" />}
        {done && msg.sources?.length > 0 && (
          <div className="sources">
            {msg.sources.map((s, i) => (
              <span key={i} className="source-chip" title={`${s.group} · ${s.where}`}>
                <FileText size={13} /> {s.title} <span className="muted">· {s.where}</span>
              </span>
            ))}
          </div>
        )}
        {done && (
          <div className="msg-actions">
            <button
              className="icon-btn sm"
              title="Copy"
              onClick={() => {
                navigator.clipboard?.writeText(msg.content)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            <button className={`icon-btn sm ${vote === 'up' ? 'on' : ''}`} onClick={() => setVote('up')} title="Good answer"><ThumbsUp size={15} /></button>
            <button className={`icon-btn sm ${vote === 'down' ? 'on' : ''}`} onClick={() => setVote('down')} title="Bad answer"><ThumbsDown size={15} /></button>
            <button className="icon-btn sm" onClick={onRetry} title="Retry"><RotateCcw size={15} /></button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage({ chat, specialist, onSend, onStop, busy, onVoice, onRetry, model, setModel }) {
  const scroller = useRef(null)
  const messages = chat?.messages || []
  const last = messages[messages.length - 1]

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, last?.content, last?.steps?.length])

  if (!messages.length) {
    return (
      <div className="home">
        <div className="hero">
          <Orb variant="full" size={170} />
          {specialist ? (
            <>
              <span className="hero-tag"><Icon name={specialist.icon} size={13} /> {specialist.name} specialist</span>
              <h1>How can {specialist.name} help?</h1>
              <p className="hero-sub">{specialist.tagline}. I search {specialist.name.toLowerCase()} documents first.</p>
            </>
          ) : (
            <>
              <h1>What can I help with?</h1>
              <p className="hero-sub">Ask about Ardena: documents, facts, numbers, applications.</p>
            </>
          )}
        </div>
        <div className="home-composer">
          <Composer onSend={onSend} busy={busy} onVoice={onVoice} onStop={onStop} model={model} setModel={setModel} placeholder={specialist?.placeholder} />
          <div className="chips" key={specialist?.id || 'general'}>
            {(specialist?.suggestions || suggestions).map((s) => (
              <button key={s.label} className="chip" onClick={() => onSend(s.prompt, {})}>
                <Icon name={s.icon} size={16} /> {s.label}
              </button>
            ))}
          </div>
        </div>
        <footer className="legal">
          Brain can be wrong. Check important facts against the cited source. Access is logged.
        </footer>
      </div>
    )
  }

  return (
    <div className="chat">
      <div className="chat-scroll" ref={scroller}>
        <div className="thread">
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="msg user"><div className="bubble">{m.content}</div></div>
            ) : (
              <AssistantMessage key={m.id} msg={m} onRetry={() => onRetry(m.id)} />
            ),
          )}
        </div>
      </div>
      <div className="chat-composer">
        <Composer onSend={onSend} busy={busy} onStop={onStop} onVoice={onVoice} compact model={model} setModel={setModel} placeholder={specialist?.placeholder} />
        <div className="legal">Brain can be wrong. Check important facts against the cited source.</div>
      </div>
    </div>
  )
}
