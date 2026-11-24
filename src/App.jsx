import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import VoiceMode from './components/VoiceMode.jsx'
import ChatPage from './pages/ChatPage.jsx'
import KnowledgeBase from './pages/KnowledgeBase.jsx'
import Login from './pages/Login.jsx'
import { AuditPage, FactsPage, HistoryPage, SettingsPage } from './pages/OtherPages.jsx'
import { specialists } from './config.js'
import * as api from './lib/api.js'
import { clearPageCache } from './lib/cache.js'
import { BrainContext, dayLabel, groupName } from './lib/brain.jsx'
import { AppSkeleton } from './components/Skeletons.jsx'

const MODE_KEY = 'ardena-brain-mode'

let seq = 0
const uid = (p) => `${p}${Date.now()}${seq++}`

// A chat as the sidebar holds it. `id` is local and stable; `serverId` is the
// conversation id once the server has one. `messages` is null until opened.
const fromSummary = (c) => ({
  id: `c${c.id}`,
  serverId: c.id,
  title: c.title,
  specialist: c.specialist,
  updatedAt: c.last_message_at,
  day: dayLabel(c.last_message_at),
  messages: null,
})

const fromServerMessage = (m) =>
  m.role === 'user'
    ? { id: `m${m.id}`, role: 'user', content: m.content }
    : {
        id: `m${m.id}`,
        serverId: m.id,
        role: 'assistant',
        status: 'done',
        content: m.content,
        steps: m.steps || [],
        sources: m.sources || [],
        feedback: m.feedback,
      }

export default function App() {
  const [authed, setAuthed] = useState(() => !!api.getToken())
  const [me, setMe] = useState(null)
  const [bootError, setBootError] = useState('')
  const [signedOutReason, setSignedOutReason] = useState('')
  const [view, setView] = useState('chat')
  const [kbGroup, setKbGroup] = useState(null)
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [model, setModelState] = useState(() => localStorage.getItem(MODE_KEY) || 'fast')
  const [collapsed, setCollapsed] = useState(false)
  // Phones and small tablets: the sidebar becomes a slide-out drawer.
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const on = () => { setIsMobile(mq.matches); if (!mq.matches) setNavOpen(false) }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voiceMin, setVoiceMin] = useState(false)
  // Specialist for the next new chat; an open chat keeps the one it started with.
  const [specialist, setSpecialist] = useState(null)
  const [busy, setBusy] = useState(false)
  const cancelRef = useRef(null)
  const chatsRef = useRef(chats)
  chatsRef.current = chats

  // Any navigation from the drawer closes it.
  useEffect(() => { setNavOpen(false) }, [view, activeChatId, kbGroup, specialist])

  const setModel = (m) => { setModelState(m); localStorage.setItem(MODE_KEY, m) }

  const signedOut = useCallback((reason) => {
    clearPageCache()
    cancelRef.current?.()
    cancelRef.current = null
    setBusy(false)
    setAuthed(false)
    setMe(null)
    setChats([])
    setActiveChatId(null)
    setVoiceOpen(false)
    setSignedOutReason(reason || '')
  }, [])

  useEffect(() => { api.setSignedOutHandler(signedOut) }, [signedOut])

  const logout = useCallback(async () => {
    try { await api.logout() } catch { /* already gone */ }
    signedOut('')
  }, [signedOut])

  const refreshMe = useCallback(() => api.me().then(setMe), [])

  // Load who I am and my chats once signed in.
  useEffect(() => {
    if (!authed) return
    setBootError('')
    Promise.all([api.me(), api.conversations()])
      .then(([m, list]) => {
        setMe(m)
        setChats(list.conversations.map(fromSummary))
      })
      .catch((e) => { if (e.status !== 401) setBootError(e.message) })
  }, [authed])

  // Client-side idle sign-out, matching the server's idle timeout.
  useEffect(() => {
    if (!authed || !me) return
    const idleMs = 30 * 60 * 1000
    let t = setTimeout(logout, idleMs)
    const reset = () => { clearTimeout(t); t = setTimeout(logout, idleMs) }
    const evs = ['mousemove', 'keydown', 'click', 'scroll']
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, reset)) }
  }, [authed, me, logout])

  const patchChat = (chatId, fn) => setChats((cs) => cs.map((c) => (c.id === chatId ? fn(c) : c)))
  const patchMsg = (chatId, msgId, fn) =>
    patchChat(chatId, (c) => ({ ...c, messages: (c.messages || []).map((m) => (m.id === msgId ? fn(m) : m)) }))

  // `spoken`: asked in voice mode, so Brain answers in plain talk to be read aloud.
  const startTurn = (chatId, prompt, { onAnswer, spoken = false } = {}) => {
    const chat = chatsRef.current.find((c) => c.id === chatId)
    const aId = uid('a')
    patchChat(chatId, (c) => ({
      ...c,
      messages: [...(c.messages || []), { id: aId, role: 'assistant', status: 'working', steps: [], content: '', sources: [], startedAt: Date.now() }],
    }))
    setBusy(true)
    let answer = ''
    const finish = () => { setBusy(false); cancelRef.current = null }

    cancelRef.current = api.streamChat(
      { message: prompt, conversationId: chat?.serverId, specialist: chat?.specialist, mode: model, spoken },
      {
        onMeta: (meta) => patchChat(chatId, (c) => ({
          ...c, serverId: meta.conversation_id, title: c.serverId ? c.title : meta.title, updatedAt: new Date().toISOString(), day: 'Today',
        })),
        onStep: (label) => patchMsg(chatId, aId, (m) => ({ ...m, steps: m.steps.at(-1) === label ? m.steps : [...m.steps, label] })),
        onSources: (sources) => patchMsg(chatId, aId, (m) => ({ ...m, sources })),
        onToken: (tok) => {
          answer += tok
          patchMsg(chatId, aId, (m) => ({ ...m, status: 'streaming', content: m.content + tok, finishedAt: m.finishedAt || Date.now() }))
        },
        onDone: (d) => {
          patchMsg(chatId, aId, (m) => ({
            ...m, status: 'done', serverId: d.message_id, steps: d.steps?.length ? d.steps : m.steps,
            sources: d.sources || m.sources, outOfScope: d.out_of_scope, finishedAt: m.finishedAt || Date.now(),
          }))
          finish()
          onAnswer?.(answer)
        },
        onError: (e) => {
          patchMsg(chatId, aId, (m) => ({ ...m, status: 'error', error: e.detail, finishedAt: Date.now() }))
          finish()
          onAnswer?.('')
        },
      },
    )
  }

  const send = (text, opts = {}) => {
    let chatId = view === 'chat' && !opts.fresh ? activeChatId : null
    const userMsg = { id: uid('u'), role: 'user', content: text }
    if (!chatId) {
      chatId = uid('new')
      const title = text.length > 60 ? text.slice(0, 59) + '…' : text
      const chat = { id: chatId, serverId: null, title, specialist: opts.fresh ? null : specialist, day: 'Today', updatedAt: new Date().toISOString(), messages: [userMsg] }
      chatsRef.current = [chat, ...chatsRef.current]
      setChats((cs) => [chat, ...cs])
      setActiveChatId(chatId)
      setView('chat')
    } else {
      chatsRef.current = chatsRef.current.map((c) => (c.id === chatId ? { ...c, messages: [...(c.messages || []), userMsg] } : c))
      patchChat(chatId, (c) => ({ ...c, messages: [...(c.messages || []), userMsg] }))
    }
    startTurn(chatId, text, opts)
  }

  const stop = () => {
    cancelRef.current?.()
    cancelRef.current = null
    setBusy(false)
    setChats((cs) =>
      cs.map((c) => ({
        ...c,
        messages: c.messages && c.messages.map((m) =>
          m.status === 'working' || m.status === 'streaming' ? { ...m, status: 'stopped', finishedAt: m.finishedAt || Date.now() } : m,
        ),
      })),
    )
  }

  const retry = (assistantId) => {
    if (busy) return
    const chat = chats.find((c) => c.id === activeChatId)
    const idx = chat.messages.findIndex((m) => m.id === assistantId)
    const prompt = [...chat.messages.slice(0, idx)].reverse().find((m) => m.role === 'user')?.content
    if (!prompt) return
    patchChat(chat.id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== assistantId) }))
    chatsRef.current = chatsRef.current.map((c) => (c.id === chat.id ? { ...c, messages: c.messages.filter((m) => m.id !== assistantId) } : c))
    startTurn(chat.id, prompt)
  }

  const rate = (msg, value) => {
    if (!msg.serverId) return
    const chat = chats.find((c) => c.id === activeChatId)
    patchMsg(chat.id, msg.id, (m) => ({ ...m, feedback: value || null }))
    api.feedback(msg.serverId, value).catch(() => {})
  }

  // Sidebar navigation tucks an open voice session into a mini bar instead of ending it.
  const go = (v) => { if (voiceOpen) setVoiceMin(true); setView(v) }

  const newChat = (sp = null) => {
    if (busy) stop()
    if (voiceOpen) setVoiceMin(true)
    setSpecialist(sp)
    setActiveChatId(null)
    setView('chat')
  }

  const openChat = async (id) => {
    if (busy) stop()
    if (voiceOpen) setVoiceMin(true)
    setActiveChatId(id)
    setView('chat')
    const c = chatsRef.current.find((x) => x.id === id)
    if (c && c.messages === null && c.serverId) {
      try {
        const full = await api.conversation(c.serverId)
        patchChat(id, (x) => ({ ...x, messages: full.messages.map(fromServerMessage) }))
      } catch (e) {
        if (e.status === 404) setChats((cs) => cs.filter((x) => x.id !== id))
      }
    }
  }

  // Chat actions from the sidebar "⋯" menu and History. Optimistic: the list
  // updates at once and rolls back if the server refuses.
  const [chatError, setChatError] = useState('')
  const flashError = (msg) => { setChatError(msg); setTimeout(() => setChatError(''), 4000) }

  const removeChat = async (id) => {
    const c = chatsRef.current.find((x) => x.id === id)
    if (!c) return
    if (activeChatId === id) newChat(null)
    setChats((cs) => cs.filter((x) => x.id !== id))
    if (!c.serverId) return
    try { await api.deleteConversation(c.serverId) } catch (e) {
      if (e.status !== 404) { setChats((cs) => [c, ...cs]); flashError(e.message || "Couldn't delete that chat.") }
    }
  }

  const renameChat = async (id, title) => {
    const c = chatsRef.current.find((x) => x.id === id)
    const clean = title.trim().slice(0, 200)
    if (!c || !clean || clean === c.title) return
    patchChat(id, (x) => ({ ...x, title: clean }))
    if (!c.serverId) return
    try { await api.renameConversation(c.serverId, clean) } catch (e) {
      patchChat(id, (x) => ({ ...x, title: c.title }))
      flashError(e.message || "Couldn't rename that chat.")
    }
  }

  const archiveChat = async (id) => {
    const c = chatsRef.current.find((x) => x.id === id)
    if (!c?.serverId) return
    if (activeChatId === id) newChat(null)
    setChats((cs) => cs.filter((x) => x.id !== id))
    try { await api.archiveConversation(c.serverId, true) } catch (e) {
      setChats((cs) => [c, ...cs])
      flashError(e.message || "Couldn't archive that chat.")
    }
  }

  // Bring an archived chat back into the list (from History → Archived).
  const restoreChat = (summary) => setChats((cs) =>
    [fromSummary({ ...summary, archived: false }), ...cs.filter((x) => x.serverId !== summary.id)]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))

  // Voice: send the transcript as a normal turn and hand back the answer to speak.
  const sendRef = useRef(send)
  sendRef.current = send
  const askByVoice = useCallback((text) => new Promise((resolve) => sendRef.current(text, { onAnswer: resolve, spoken: true })), [])

  const ctx = useMemo(() => ({ me, groups: me?.groups || [], refreshMe }), [me, refreshMe])

  if (!authed) {
    return <Login reason={signedOutReason} onSignedIn={() => { setSignedOutReason(''); setAuthed(true) }} />
  }

  if (!me && !bootError) return <AppSkeleton />

  if (!me) {
    return (
      <div className="boot">
        {bootError ? (
          <div className="boot-card">
            <p>{bootError}</p>
            <button className="primary-btn" onClick={() => window.location.reload()}>Try again</button>
            <button className="link-btn center" onClick={logout}>Sign out</button>
          </div>
        ) : null}
      </div>
    )
  }

  const activeChat = chats.find((c) => c.id === activeChatId)
  const activeSpecialist = specialists.find((x) => x.id === (activeChat ? activeChat.specialist : specialist)) || null
  const openVoice = () => { setVoiceOpen(true); setVoiceMin(false) }
  const titles = {
    kb: kbGroup === 'all' ? 'Knowledge base / All' : kbGroup ? `Knowledge base / ${groupName(ctx.groups, kbGroup)}` : 'Knowledge base',
    facts: 'Company facts',
    history: 'History',
    settings: 'Settings',
    audit: 'Audit log',
  }

  return (
    <BrainContext.Provider value={ctx}>
      <div className="app">
        <div className={`shell ${collapsed && !isMobile ? 'is-collapsed' : ''}`}>
          {isMobile && navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
          <Sidebar
            mobile={isMobile}
            mobileOpen={navOpen}
            onCloseMobile={() => setNavOpen(false)}
            view={view}
            setView={(v) => { setNavOpen(false); go(v) }}
            specialist={activeChat ? activeChat.specialist : specialist}
            onSpecialist={(id) => { setNavOpen(false); newChat(id) }}
            kbGroup={kbGroup}
            setKbGroup={setKbGroup}
            chats={chats}
            activeChatId={activeChatId}
            openChat={(id) => { setNavOpen(false); openChat(id) }}
            newChat={(sp) => { setNavOpen(false); newChat(sp) }}
            onRenameChat={renameChat}
            onArchiveChat={archiveChat}
            onDeleteChat={removeChat}
            collapsed={collapsed && !isMobile}
            setCollapsed={setCollapsed}
          />
          <main className="main">
            <Topbar
              title={view === 'chat' ? null : titles[view]}
              specialist={view === 'chat' ? activeSpecialist : null}
              onClearSpecialist={() => newChat(null)}
              onProfile={() => go('settings')}
              onMenu={isMobile ? () => setNavOpen(true) : null}
              onNewChat={isMobile ? () => newChat(null) : null}
            />
            <div className="main-body">
              {view === 'chat' && (
                <ChatPage
                  chat={activeChat}
                  specialist={activeSpecialist}
                  onSend={send}
                  onStop={stop}
                  busy={busy}
                  onVoice={openVoice}
                  onRetry={retry}
                  onRate={rate}
                  model={model}
                  setModel={setModel}
                />
              )}
              {view === 'kb' && <KnowledgeBase group={kbGroup} setGroup={setKbGroup} onAsk={(t) => send(t, { fresh: true })} />}
              {view === 'facts' && <FactsPage />}
              {view === 'history' && (
                <HistoryPage chats={chats} openChat={openChat} removeChat={removeChat} archiveChat={archiveChat} renameChat={renameChat} onRestored={restoreChat} />
              )}
              {view === 'settings' && <SettingsPage onLogout={logout} onLoggedOutEverywhere={() => signedOut('')} model={model} setModel={setModel} onAudit={() => go('audit')} />}
              {view === 'audit' && <AuditPage />}
            </div>
            {chatError && <div className="toast" role="status">{chatError}</div>}
            {voiceOpen && (
              <VoiceMode
                minimized={voiceMin}
                specialist={activeSpecialist}
                enabled={me.voice_enabled}
                onExpand={() => { setVoiceMin(false); setView('chat') }}
                onClose={() => { setVoiceOpen(false); setVoiceMin(false) }}
                ask={askByVoice}
              />
            )}
          </main>
        </div>
      </div>
    </BrainContext.Provider>
  )
}
