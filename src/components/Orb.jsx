// Atlas's face. `variant="badge"` crops the robot's head into a frosted circle
// (chat avatars); `variant="full"` shows the whole floating robot (hero, login).
export default function Orb({ size = 64, state = 'idle', variant = 'badge' }) {
  if (variant === 'full') {
    return (
      <div className={`ai-full ai-${state}`} style={{ width: size }}>
        <img src="/ai.png" alt="Ardena Atlas" draggable="false" />
        <span className="ai-shadow" />
      </div>
    )
  }
  return (
    <div className={`ai-badge ai-${state}`} style={{ width: size, height: size }}>
      <img src="/ai.png" alt="" draggable="false" />
    </div>
  )
}
