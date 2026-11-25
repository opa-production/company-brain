import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, PanelLeft, SquarePen, BookOpen, KeyRound, History, Settings, ChevronDown, ChevronRight, ArrowRight,
  MoreHorizontal, Pencil, Archive, Trash2, X,
} from 'lucide-react'
import { Icon } from './Icon.jsx'
import { specialists } from '../config.js'
import { useBrain } from '../lib/brain.jsx'

// One chat in the list, with a "⋯" menu: Rename (inline), Archive, Delete.
function ChatRow({ chat, active, onOpen, onRename, onArchive, onDelete }) {
  const [menu, setMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(chat.title)
  const ref = useRef(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const [pos, setPos] = useState(null)
  const sp = specialists.find((s) => s.id === chat.specialist)
  const saved = !!chat.serverId
  const closeMenu = () => { setMenu(false); setConfirmDelete(false) }

  // The menu renders in a portal on <body>, placed next to the ⋯ button.
  // It opens upward when there isn't room below, so it is never cut off.
  useLayoutEffect(() => {
    if (!menu) return
    const place = () => {
      const b = btnRef.current?.getBoundingClientRect()
      const m = menuRef.current
      if (!b || !m) return
      const h = m.offsetHeight
      const w = m.offsetWidth
      const below = window.innerHeight - b.bottom
      const top = below >= h + 12 ? b.bottom + 4 : Math.max(8, b.top - h - 4)
      const left = Math.min(Math.max(8, b.right - w), window.innerWidth - w - 8)
      setPos({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [menu, confirmDelete])

  useEffect(() => {
    if (!menu) return
    const outside = (e) => {
      if (ref.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      closeMenu()
    }
    const esc = (e) => { if (e.key === 'Escape') closeMenu() }
    // Scrolling the list would leave the menu behind, so close it.
    const scroll = (e) => { if (!menuRef.current?.contains(e.target)) closeMenu() }
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside, { passive: true })
    document.addEventListener('keydown', esc)
    document.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
      document.removeEventListener('keydown', esc)
      document.removeEventListener('scroll', scroll, true)
    }
  }, [menu])

  const commit = () => {
    setEditing(false)
    if (draft.trim() && draft.trim() !== chat.title) onRename(chat.id, draft)
    else setDraft(chat.title)
  }

  if (editing) {
    return (
      <div className="chat-row editing">
        <input
          className="chat-rename"
          autoFocus
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setDraft(chat.title); setEditing(false) }
          }}
        />
      </div>
    )
  }

  return (
    <div className={`chat-row ${active ? 'active' : ''} ${menu ? 'menu-open' : ''}`} ref={ref}>
      <button className="chat-link" onClick={onOpen} title={sp ? `${sp.name} specialist · ${chat.title}` : chat.title}>
        {sp && <Icon name={sp.icon} size={13} className="chat-sp" />}
        <span>{chat.title}</span>
      </button>
      <button
        ref={btnRef}
        className="chat-more"
        title={saved ? 'Chat actions' : 'Available once the first answer is saved'}
        disabled={!saved}
        onClick={() => { setMenu((m) => !m); setConfirmDelete(false) }}
      >
        <MoreHorizontal size={16} />
      </button>
      {menu && createPortal(
        <div
          ref={menuRef}
          className="menu chat-menu"
          style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: 0, left: 0 }}
        >
          <button className="menu-item" onClick={() => { setMenu(false); setDraft(chat.title); setEditing(true) }}>
            <Pencil size={15} /><span className="menu-grow">Rename</span>
          </button>
          <button className="menu-item" onClick={() => { setMenu(false); onArchive(chat.id) }}>
            <Archive size={15} /><span className="menu-grow">Archive</span>
          </button>
          <div className="menu-sep" />
          {confirmDelete ? (
            <div className="menu-confirm">
              <div className="menu-hint">Delete this chat for good? This can't be undone.</div>
              <div className="menu-confirm-row">
                <button className="ghost-btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
                <button className="danger-btn" onClick={() => { setMenu(false); onDelete(chat.id) }}>Delete</button>
              </div>
            </div>
          ) : (
            <button className="menu-item danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} /><span className="menu-grow">Delete</span>
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

export default function Sidebar({
  view, setView, kbGroup, setKbGroup, chats, activeChatId, openChat, newChat,
  collapsed, setCollapsed, specialist, onSpecialist, onRenameChat, onArchiveChat, onDeleteChat,
  mobile, mobileOpen, onCloseMobile,
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
    <aside className={`sidebar ${mobile ? 'mobile' : ''} ${mobileOpen ? 'mobile-open' : ''}`} aria-hidden={mobile && !mobileOpen}>
      <div className="brand-row">
        <button className="brand" onClick={() => newChat()} title="Ardena Atlas">
          <img src="/logo.png" alt="Ardena" />
        </button>
        <div className="brand-actions">
          <button className="icon-btn" title="Search chats" onClick={() => setSearching((s) => !s)}><Search size={17} /></button>
          {mobile
            ? <button className="icon-btn" title="Close menu" onClick={onCloseMobile}><X size={18} /></button>
            : <button className="icon-btn" title="Collapse sidebar" onClick={() => setCollapsed(true)}><PanelLeft size={17} /></button>}
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
            {filtered.filter((c) => c.day === d).map((c) => (
              <ChatRow
                key={c.id}
                chat={c}
                active={view === 'chat' && activeChatId === c.id}
                onOpen={() => openChat(c.id)}
                onRename={onRenameChat}
                onArchive={onArchiveChat}
                onDelete={onDeleteChat}
              />
            ))}
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
