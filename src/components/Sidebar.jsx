import { useState } from 'react'
import {
  Search, PanelLeft, SquarePen, BookOpen, KeyRound, History, Settings, ChevronDown, ChevronRight, ArrowRight,
} from 'lucide-react'
import { Icon } from './Icon.jsx'
import { specialists } from '../config.js'
import { useBrain } from '../lib/brain.jsx'

export default function Sidebar({
  view, setView, kbGroup, setKbGroup, chats, activeChatId, openChat, newChat,
  collapsed, setCollapsed, specialist, onSpecialist,
}) {
  const { groups: kbGroups } = useBrain()
  const [kbOpen, setKbOpen] = useState(true)
  const [searching, setSearching] = useState(false)
  const [q, setQ] = useState('')

  if (collapsed) {
    return (
      <aside className="sidebar collapsed">
        <img className="brand-mark" src="/logo-mark.png" alt="Ardena" />
        <button className="icon-btn" title="Expand sidebar" onClick={() => setCollapsed(false)}><PanelLeft size={18} /></button>
        <button className="icon-btn" title="New chat" onClick={() => newChat()}><SquarePen size={18} /></button>
        <span className="rail-sep" />
        {specialists.map((s) => (
          <button key={s.id} className={`icon-btn ${view === 'chat' && specialist === s.id ? 'on' : ''}`} title={`${s.name} specialist`} onClick={() => onSpecialist(s.id)}>
            <Icon name={s.icon} size={18} />
          </button>
        ))}
        <span className="rail-sep" />
        <button className="icon-btn" title="Knowledge base" onClick={() => setView('kb')}><BookOpen size={18} /></button>
        <button className="icon-btn" title="Company facts" onClick={() => setView('facts')}><KeyRound size={18} /></button>
      </aside>
    )
  }

  const filtered = chats.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()))
  const days = [...new Set(filtered.map((c) => c.day))]

  const NavItem = ({ id, icon: I, label }) => (
    <button className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}>
      <I size={17} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  )

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <button className="brand" onClick={() => newChat()} title="Ardena Brain">
          <img src="/logo.png" alt="Ardena" />
        </button>
        <div className="brand-actions">
          <button className="icon-btn" title="Search chats" onClick={() => setSearching((s) => !s)}><Search size={17} /></button>
          <button className="icon-btn" title="Collapse sidebar" onClick={() => setCollapsed(true)}><PanelLeft size={17} /></button>
        </div>
      </div>

      {searching && (
        <div className="side-search">
          <Search size={14} />
          <input autoFocus placeholder="Search chats" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      <button className="new-chat" onClick={() => newChat()}>
        <SquarePen size={16} strokeWidth={1.8} />
        <span>New chat</span>
      </button>

      <div className="side-label">Specialists</div>
      <nav className="nav">
        {specialists.map((s) => (
          <button
            key={s.id}
            className={`nav-item spec ${view === 'chat' && specialist === s.id ? 'active' : ''}`}
            onClick={() => onSpecialist(s.id)}
            title={s.tagline}
          >
            <span className="spec-icon"><Icon name={s.icon} size={15} /></span>
            <span>{s.name}</span>
          </button>
        ))}
      </nav>

      <div className="side-label">Workspace</div>
      <nav className="nav">
        <div className="nav-group">
          <button className={`nav-item ${view === 'kb' && !kbGroup ? 'active' : ''}`} onClick={() => { setKbGroup(null); setView('kb') }}>
            <BookOpen size={17} strokeWidth={1.8} />
            <span>Knowledge base</span>
            <span className="caret" onClick={(e) => { e.stopPropagation(); setKbOpen((o) => !o) }}>
              {kbOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </span>
          </button>
          {kbOpen && (
            <div className="sub-nav">
              {kbGroups.map((g) => (
                <button
                  key={g.key}
                  className={`sub-item ${view === 'kb' && kbGroup === g.key ? 'active' : ''}`}
                  onClick={() => { setKbGroup(g.key); setView('kb') }}
                >
                  <Icon name={g.icon} size={15} />
                  <span>{g.name}</span>
                </button>
              ))}
              <button
                className={`sub-item view-all ${view === 'kb' && kbGroup === 'all' ? 'active' : ''}`}
                onClick={() => { setKbGroup('all'); setView('kb') }}
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
        <NavItem id="facts" icon={KeyRound} label="Company facts" />
        <NavItem id="history" icon={History} label="History" />
      </nav>

      <div className="chat-list">
        {days.map((d) => (
          <div key={d}>
            <div className="day-label">{d}</div>
            {filtered.filter((c) => c.day === d).map((c) => {
              const sp = specialists.find((s) => s.id === c.specialist)
              return (
                <button
                  key={c.id}
                  className={`chat-link ${view === 'chat' && activeChatId === c.id ? 'active' : ''}`}
                  onClick={() => openChat(c.id)}
                  title={sp ? `${sp.name} specialist` : undefined}
                >
                  {sp && <Icon name={sp.icon} size={13} className="chat-sp" />}
                  <span>{c.title}</span>
                </button>
              )
            })}
          </div>
        ))}
        {filtered.length === 0 && <div className="muted small pad">No chats match “{q}”.</div>}
      </div>

      <div className="side-bottom">
        <NavItem id="settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  )
}
