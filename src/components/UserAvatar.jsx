import { useState } from 'react'

// Everyone's profile picture: the shared image at /avatar.png.
// Falls back to initials if the image is missing.
export const AVATAR_SRC = '/avatar.png'

export default function UserAvatar({ user, size = 'md', className = '', ...rest }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className={`avatar-img ${size} ${className}`} {...rest}>
      {broken ? (
        <span className="avatar-initials">{user?.initials}</span>
      ) : (
        <img src={AVATAR_SRC} alt="" draggable="false" onError={() => setBroken(true)} />
      )}
    </span>
  )
}
