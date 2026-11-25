import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, ChevronDown, ChevronRight, FileText, Pencil, RefreshCw, Volume2, Square } from 'lucide-react'
import Loader from '../components/Loader.jsx'
import { toggleReading, useReadAloud } from '../lib/readAloud.js'
import Composer from '../components/Composer.jsx'
import Orb from '../components/Orb.jsx'
import { Icon } from '../components/Icon.jsx'
import { Markdown, copyAnswer } from '../lib/markdown.jsx'
import { greeting } from '../lib/greeting.js'
import { useBrain } from '../lib/brain.jsx'
import { ChatSkeleton } from '../components/Skeletons.jsx'

function Working({ label }) {
  return (
    <div className="working">
      <span className="spark" />
      <span className="shimmer">{label}…</span>
    </div>
  )
}

// A small "copied" tick that clears itself.
function useFlash() {
  const [on, setOn] = useState(false)
  const t = useRef(null)
  useEffect(() => () => clearTimeout(t.current), [])
  return [on, () => { setOn(true); clearTimeout(t.current); t.current = setTimeout(() => setOn(false), 1400) }]
}

function ThoughtFor({ msg }) {
  const [open, setOpen] = useState(false)
  if (!msg.steps?.length) return null
  // Live answers know how long they took; ones loaded from history don't.
  const secs = msg.startedAt && msg.finishedAt ? Math.max(1, Math.round((msg.finishedAt - msg.startedAt) / 1000)) : null
  return (
    <div className="thought">
      <button className="thought-btn" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {msg.status === 'stopped' ? 'Stopped' : secs ? `Thought for ${secs}s` : `${msg.steps.length} step${msg.steps.length === 1 ? '' : 's'}`}
      </button>
      {open && (
        <ol className="thought-steps">
          {msg.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
    </div>
  )
}

// Speaker button: read this answer aloud, or stop it.
function ReadAloudButton({ msg }) {
  const r = useReadAloud()
  const mine = r.id === msg.id
  return (
    <button
      className={`icon-btn sm ${mine ? 'on' : ''}`}
      title={mine ? 'Stop reading' : 'Read aloud'}
      onClick={() => toggleReading(msg.id, msg.content)}
    >
      {mine && r.phase === 'loading' ? <Loader size={15} /> : mine ? <Square size={12} fill="currentColor" /> : <Volume2 size={15} />}
    </button>
  )
}

function ReadAloudError({ msg }) {
  const r = useReadAloud()
  return r.errorId === msg.id && r.error ? <div className="msg-note">{r.error}</div> : null
}

const AssistantMessage = memo(function AssistantMessage({ msg, actions, canSpeak }) {
  const [copied, flash] = useFlash()
  const body = useRef(null)
  const vote = msg.feedback === 1 ? 'up' : msg.feedback === -1 ? 'down' : null
  const working = msg.status === 'working'
  const failed = msg.status === 'error'
  const done = msg.status === 'done' || msg.status === 'stopped'

  return (
    <div className="msg assistant">
      <Orb size={34} state={working || msg.status === 'streaming' ? 'busy' : 'idle'} />
      <div className="msg-body">
        {!working && <ThoughtFor msg={msg} />}
        {working && <Working label={msg.steps[msg.steps.length - 1] || 'Thinking'} />}
        {msg.content && <div ref={body}><Markdown text={msg.content} /></div>}
        {failed && (
          <div className="msg-error">
            {msg.error || 'Atlas could not answer that.'}
            <button className="link-btn" onClick={() => actions.current.retry(msg.id)}><RotateCcw size={13} /> Try again</button>
          </div>
        )}
        {done && msg.outOfScope?.length > 0 && (
          <div className="msg-note">Part of this is outside what your role can see.</div>
        )}
        {msg.status === 'streaming' && <span className="caret-blink" />}
        {done && msg.sources?.length > 0 && (
          <div className="sources">
            {msg.sources.map((s, i) => (
              <span key={i} className="source-chip" title={`${s.group_name || s.group} · ${s.where}`}>
                <FileText size={13} /> {s.title} <span className="muted">· {s.where}</span>
              </span>
            ))}
          </div>
        )}
        {done && (
          <div className="msg-actions">
            <button
              className="icon-btn sm"
              title={copied ? 'Copied' : 'Copy answer'}
              onClick={() => { copyAnswer(msg.content, body.current?.firstChild); flash() }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            {canSpeak && msg.content && <ReadAloudButton msg={msg} />}
            {msg.serverId && <>
              <button className={`icon-btn sm ${vote === 'up' ? 'on' : ''}`} onClick={() => actions.current.rate(msg, vote === 'up' ? 0 : 1)} title="Good answer"><ThumbsUp size={15} /></button>
              <button className={`icon-btn sm ${vote === 'down' ? 'on' : ''}`} onClick={() => actions.current.rate(msg, vote === 'down' ? 0 : -1)} title="Bad answer"><ThumbsDown size={15} /></button>
            </>}
            <button className="icon-btn sm" onClick={() => actions.current.retry(msg.id)} title="Retry"><RotateCcw size={15} /></button>
          </div>
        )}
        {done && canSpeak && <ReadAloudError msg={msg} />}
      </div>
    </div>
  )
})

const UserMessage = memo(function UserMessage({ msg, busy, actions }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(msg.content)
  const [copied, flash] = useFlash()
  const ta = useRef(null)

  useLayoutEffect(() => {
    if (!editing || !ta.current) return
    ta.current.style.height = 'auto'
    ta.current.style.height = Math.min(ta.current.scrollHeight, 260) + 'px'
  }, [editing, draft])

  const startEdit = () => {
    setDraft(msg.content)
    setEditing(true)
    requestAnimationFrame(() => { const el = ta.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } })
  }
  const save = () => {
    const t = draft.trim()
    if (!t || busy) return
    setEditing(false)
    actions.current.resend(msg.id, t)
  }

  if (editing) {
    return (
      <div className="msg user editing">
        <div className="bubble-edit">
          <textarea
            ref={ta}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
              if (e.key === 'Escape') setEditing(false)
            }}
          />
          <div className="bubble-edit-row">
            <span className="muted small">Atlas answers again from here. Later messages are replaced.</span>
            <button className="ghost-btn sm" onClick={() => setEditing(false)}>Cancel</button>
            <button className="primary-btn sm" onClick={save} disabled={busy || !draft.trim()}>Send</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="msg user">
      <div className="bubble">{msg.content}</div>
      <div className="user-actions">
        <button className="icon-btn sm" title={copied ? 'Copied' : 'Copy question'} onClick={() => { navigator.clipboard?.writeText(msg.content); flash() }}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        <button className="icon-btn sm" title="Edit question" onClick={startEdit} disabled={busy}><Pencil size={14} /></button>
        <button className="icon-btn sm" title="Ask again" onClick={() => actions.current.resend(msg.id, msg.content)} disabled={busy}><RefreshCw size={14} /></button>
      </div>
    </div>
  )
})

export default function ChatPage({ chat, specialist, onSend, onStop, busy, onVoice, onRetry, onRate, onResend, model, setModel, autoRead, setAutoRead }) {
  const scroller = useRef(null)
  const stick = useRef(true)
  const messages = chat?.messages || []
  const last = messages[messages.length - 1]
  const { me } = useBrain()
  const canSpeak = !!me?.voice_enabled
  const speakProps = canSpeak ? { autoRead, setAutoRead } : {}
  // A new greeting each time the home screen opens, picked for the time of day.
  const hello = useMemo(() => greeting(me?.user?.name), [chat?.id, specialist?.id, me?.user?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  // One stable object for the message rows, so memoised rows don't re-render
  // just because the parent handed down fresh callbacks.
  const actions = useRef({})
  actions.current = { retry: onRetry, rate: onRate, resend: onResend }

  // Follow the answer while it streams, unless the reader has scrolled up.
  const onScroll = () => {
    const el = scroller.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }
  useEffect(() => { stick.current = true }, [chat?.id, messages.length])
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages.length, last?.content, last?.steps?.length, last?.status])

  if (chat && chat.messages === null) {
    return <ChatSkeleton />
  }

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
              <h1>{hello.title}</h1>
              <p className="hero-sub">{hello.sub}</p>
            </>
          )}
        </div>
        <div className="home-composer">
          <Composer onSend={onSend} busy={busy} onVoice={onVoice} onStop={onStop} model={model} setModel={setModel} placeholder={specialist?.placeholder} {...speakProps} />
          {specialist?.suggestions && (
            <div className="chips" key={specialist.id}>
              {specialist.suggestions.map((s) => (
                <button key={s.label} className="chip" onClick={() => onSend(s.prompt, {})}>
                  <Icon name={s.icon} size={16} /> {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="chat">
      <div className="chat-scroll" ref={scroller} onScroll={onScroll}>
        <div className="thread">
          {messages.map((m) =>
            m.role === 'user'
              ? <UserMessage key={m.id} msg={m} busy={busy} actions={actions} />
              : <AssistantMessage key={m.id} msg={m} actions={actions} canSpeak={canSpeak} />,
          )}
        </div>
      </div>
      <div className="chat-composer">
        <Composer onSend={onSend} busy={busy} onStop={onStop} onVoice={onVoice} compact model={model} setModel={setModel} placeholder={specialist?.placeholder} {...speakProps} />
        <div className="legal">Atlas can be wrong. Check important facts against the cited source.</div>
      </div>
    </div>
  )
}
