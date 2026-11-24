// The Ardena spinner: two orbiting rings (ink + YC orange). `size` is the
// diameter in px; `tone="light"` for use on orange or dark buttons.
export default function Loader({ size = 48, tone = 'dark', className = '', label = 'Loading' }) {
  return (
    <span
      className={`loader ${tone === 'light' ? 'loader-light' : ''} ${className}`}
      style={{ '--size': `${size / 48}px` }}
      role="status"
      aria-label={label}
    />
  )
}

// Centred spinner for a panel that has nothing to show yet.
export function LoaderBlock({ size = 36, label }) {
  return <div className="loader-block"><Loader size={size} label={label} /></div>
}
