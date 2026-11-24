import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import VoiceMode from './components/VoiceMode.jsx'
import ChatPage from './pages/ChatPage.jsx'
import KnowledgeBase from './pages/KnowledgeBase.jsx'
import Login from './pages/Login.jsx'
import { FactsPage, HistoryPage, SettingsPage } from './pages/OtherPages.jsx'
import { initialChats, kbGroups, specialists } from './data/mock.js'
import { runMockTurn } from './lib/mockBrain.js'

const SESSION_KEY = 'ardena-brain-session'
const IDLE_MS = 30 * 60 * 1000

let seq = 0
const uid = (p) => `${p}${Date.now()}${seq++}`

export default function App() {
  const [session, setSession] = useState(() => sessionStorage.getItem(SESSION_KEY))
  const [view, setView] = useState('chat')
  const [kbGroup, setKbGroup] = useState(null)
  const [chats, setChats] = useState(initialChats)
  const [activeChatId, setActiveChatId] = useState(null)
  const [model, setModel] = useState('fast')
  const [collapsed, setCollapsed] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voiceMin, setVoiceMin] = useState(false)
  // Specialist for the next new chat; an open chat keeps the one it started with.
  const [specialist, setSpecialist] = useState(null)
  const [busy, setBusy] = useState(false)
  const cancelRef = useRef(null)

  const logout = useCallback(() => {
    cancelRef.current?.()
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  // Idle sign-out, matching the planned 30-minute Brain session idle timeout.
  useEffect(() => {
    if (!session) return
    let t = setTimeout(logout, IDLE_MS)
    const reset = () => { clearTimeout(t); t = setTimeout(logout, IDLE_MS) }
    const evs = ['mousemove', 'keydown', 'click', 'scroll']
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, reset)) }
  }, [session, logout])

  const patchMsg = (chatId, msgId, fn) =>
    setChats((cs) => cs.map((c) => (c.id !== chatId ? c : { ...c, messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) })))

  const startTurn = (chatId, prompt, sp) => {
    const aId = uid('a')
    setChats((cs) =>
      cs.map((c) =>
        c.id !== chatId
          ? c
          : { ...c, messages: [...c.messages, { id: aId, role: 'assistant', status: 'working', steps: [], content: '', sources: [], startedAt: Date.now() }] },
      ),
    )
    setBusy(true)
    cancelRef.current = runMockTurn(prompt, {
      onStep: (label) => patchMsg(chatId, aId, (m) => ({ ...m, steps: [...m.steps, label] })),
      onSources: (sources) => patchMsg(chatId, aId, (m) => ({ ...m, sources, status: 'streaming', finishedAt: Date.now() })),
      onToken: (tok) => patchMsg(chatId, aId, (m) => ({ ...m, content: m.content + tok })),
      onDone: () => {
        patchMsg(chatId, aId, (m) => ({ ...m, status: 'done' }))
        setBusy(false)
        cancelRef.current = null
      },
    }, { specialist: sp, mode: model })
  }

  const send = (text) => {
    let chatId = view === 'chat' ? activeChatId : null
    const userMsg = { id: uid('u'), role: 'user', content: text }
    let sp = chats.find((c) => c.id === chatId)?.specialist ?? null
    if (!chatId) {
      chatId = uid('c')
      sp = specialist
      const title = text.length > 38 ? text.slice(0, 38) + '…' : text
      setChats((cs) => [{ id: chatId, title, day: 'Today', specialist: sp, messages: [userMsg] }, ...cs])
      setActiveChatId(chatId)
      setView('chat')
    } else {
      setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, userMsg] } : c)))
    }
    startTurn(chatId, text, sp)
  }

  const stop = () => {
    cancelRef.current?.()
    cancelRef.current = null
    setBusy(false)
    setChats((cs) =>
      cs.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
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
    setChats((cs) => cs.map((c) => (c.id === chat.id ? { ...c, messages: c.messages.filter((m) => m.id !== assistantId) } : c)))
    startTurn(chat.id, prompt, chat.specialist)
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

  const openChat = (id) => {
    if (busy) stop()
    const c = chats.find((x) => x.id === id)
    if (voiceOpen) setVoiceMin(true)
    setActiveChatId(id)
    setView('chat')
    // Seeded history entries have no messages yet: replay their title as the question.
    if (c && c.messages.length === 0) {
      const userMsg = { id: uid('u'), role: 'user', content: c.title }
      setChats((cs) => cs.map((x) => (x.id === id ? { ...x, messages: [userMsg] } : x)))
      startTurn(id, c.title, c.specialist)
    }
  }

  const sendRef = useRef(send)
  sendRef.current = send
  const onVoiceTranscript = useCallback((t) => sendRef.current(t), [])

  if (!session) {
    return (
      <Login
        onSignedIn={({ email }) => {
          sessionStorage.setItem(SESSION_KEY, email)
          setSession(email)
        }}
      />
    )
  }

  const activeChat = chats.find((c) => c.id === activeChatId)
  const activeSpecialist = specialists.find((x) => x.id === (activeChat ? activeChat.specialist : specialist)) || null
  const openVoice = () => { setVoiceOpen(true); setVoiceMin(false) }
  const titles = {
    kb: kbGroup === 'all' ? 'Knowledge base / All' : kbGroup ? `Knowledge base / ${kbGroups.find((g) => g.id === kbGroup)?.name}` : 'Knowledge base',
    facts: 'Company facts',
    history: 'History',
    settings: 'Settings',
  }

  return (
    <div className="app">
      <div className={`shell ${collapsed ? 'is-collapsed' : ''}`}>
        <Sidebar
          view={view}
          setView={go}
          specialist={activeChat ? activeChat.specialist : specialist}
          onSpecialist={(id) => newChat(id)}
          kbGroup={kbGroup}
          setKbGroup={setKbGroup}
          chats={chats}
          activeChatId={activeChatId}
          openChat={openChat}
          newChat={newChat}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
        <main className="main">
          <Topbar
            title={view === 'chat' ? null : titles[view]}
            specialist={view === 'chat' ? activeSpecialist : null}
            onClearSpecialist={() => newChat(null)}
            onProfile={() => go('settings')}
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
                model={model}
                setModel={setModel}
              />
            )}
            {view === 'kb' && <KnowledgeBase group={kbGroup} setGroup={setKbGroup} onAsk={send} />}
            {view === 'facts' && <FactsPage />}
            {view === 'history' && <HistoryPage chats={chats} openChat={openChat} />}
            {view === 'settings' && <SettingsPage onLogout={logout} model={model} setModel={setModel} />}
          </div>
          {voiceOpen && (
            <VoiceMode
              minimized={voiceMin}
              specialist={activeSpecialist}
              onExpand={() => { setVoiceMin(false); setView('chat') }}
              onClose={() => { setVoiceOpen(false); setVoiceMin(false) }}
              onTranscript={onVoiceTranscript}
            />
          )}
        </main>
      </div>
    </div>
  )
}
