import { Mail, Bell, X } from 'lucide-react'
import { currentUser } from '../data/mock.js'
import { Icon } from './Icon.jsx'

export default function Topbar({ title, specialist, onClearSpecialist, onProfile }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {title && <div className="page-title">{title}</div>}
        {specialist && (
          <span className="spec-chip" title={specialist.tagline}>
            <Icon name={specialist.icon} size={14} />
            {specialist.name} specialist
            <button onClick={onClearSpecialist} title="Back to general Brain"><X size={13} /></button>
          </span>
        )}
        <span className="mock-pill">Mock data</span>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" title="Messages"><Mail size={18} strokeWidth={1.8} /></button>
        <button className="icon-btn has-dot" title="Notifications"><Bell size={18} strokeWidth={1.8} /></button>
        <button className="avatar" onClick={onProfile} title={`${currentUser.name} · Settings`}>
          {currentUser.initials}<span className="online" />
        </button>
      </div>
    </header>
  )
}
