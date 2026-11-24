import { X } from 'lucide-react'
import { useBrain } from '../lib/brain.jsx'
import { Icon } from './Icon.jsx'

export default function Topbar({ title, specialist, onClearSpecialist, onProfile }) {
  const { me } = useBrain()
  const currentUser = me.user
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
      </div>
      <div className="topbar-right">
        <button className="avatar" onClick={onProfile} title={`${currentUser.name} · Settings`}>
          {currentUser.initials}<span className="online" />
        </button>
      </div>
    </header>
  )
}
