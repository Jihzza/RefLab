import type { SearchedUser } from '../types'
import { useNavigate } from 'react-router-dom'

interface Props {
  user: SearchedUser
  onClick?: (user: SearchedUser) => void
}

export default function SearchHistoryItem({ user, onClick }: Props) {
  const navigate = useNavigate()
  const displayName = user.name || user.username
  const initials = displayName.slice(0, 2).toUpperCase()

  const openProfile = () => {
    if (onClick) onClick(user)
    navigate(`/app/profile/${encodeURIComponent(user.username)}`)
  }

  return (
    <button
      type="button"
      onClick={openProfile}
      className="w-full bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-3 flex items-center gap-3 hover:bg-(--bg-hover) transition-colors"
    >
      {user.photo_url ? (
        <img src={user.photo_url} alt={displayName} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-(--bg-primary)">{initials}</span>
        </div>
      )}

      <div className="flex-1 min-w-0 text-left">
        <div className="text-sm font-semibold text-(--text-primary) truncate">{displayName}</div>
        <div className="text-xs text-(--text-muted) truncate">@{user.username}</div>
      </div>
    </button>
  )
}
