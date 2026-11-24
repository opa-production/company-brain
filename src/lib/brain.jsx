// Who is signed in and what they can see, shared across the app.
import { createContext, useContext } from 'react'

export const BrainContext = createContext({ me: null, groups: [], refreshMe: () => {} })
export const useBrain = () => useContext(BrainContext)

export const groupName = (groups, key) => groups.find((g) => g.key === key)?.name || key

// "Today", "Yesterday", "Previous 7 days", "Older" from an ISO timestamp.
export function dayLabel(iso) {
  const d = new Date(iso)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const diff = (start - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return 'Previous 7 days'
  if (diff < 30) return 'Previous 30 days'
  return 'Older'
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
