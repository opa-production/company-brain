import { X, Menu, SquarePen } from 'lucide-react'
import { useBrain } from '../lib/brain.jsx'
import { Icon } from './Icon.jsx'

export default function Topbar({ title, specialist, onClearSpecialist, onProfile, onMenu, onNewChat }) {
  const { me } = useBrain()
  const currentUser = me.user
  return (
    <header className="topbar">
      <div className="topbar-left">
        {onMenu && <button className="icon-btn topbar-menu" onClick={onMenu} title="Menu" aria-label="Open menu"><Menu size={20} /></button>}
        {onMenu && !title && !specialist && <img className="topbar-logo" src="/logo.png" alt="Ardena" />}
        {title && <div className="page-title">{title}</div>}
        {specialist && (
          <span className="spec-chip" title={specialist.tagline}>
            <Icon name={specialist.icon} size={14} />
            <span className="spec-chip-text">{specialist.name} specialist</span>
            <button onClick={onClearSpecialist} title="Back to general Brain"><X size={13} /></button>
          </span>
        )}
      </div>
      <div className="topbar-right">
        {onNewChat && <button className="icon-btn" onClick={onNewChat} title="New chat" aria-label="New chat"><SquarePen size={19} /></button>}
        <button className="avatar" onClick={onProfile} title={`${currentUser.name} · Settings`}>
          {currentUser.initials}<span className="online" />
        </button>
      </div>
    </header>
  )
}
