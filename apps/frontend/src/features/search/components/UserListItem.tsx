import React from 'react'
import type { SearchedUser } from '../types'
import { useNavigate } from 'react-router-dom'

interface Props {
  user: SearchedUser
  onSelect?: (user: SearchedUser) => void
}

export default function UserListItem({ user, onSelect }: Props) {
  const navigate = useNavigate()

  const openProfile = () => {
    if (onSelect) onSelect(user)
    navigate(`/app/profile/${encodeURIComponent(user.username)}`)
  }

  const onKeyDown: React.KeyboardEventHandler = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openProfile()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openProfile}
      onKeyDown={onKeyDown}
      className="flex items-center gap-3 px-3 py-2 hover:bg-(--bg-surface-2) rounded-(--radius-input) cursor-pointer"
    >
      {user.photo_url ? (
        <img
          src={user.photo_url}
          alt={user.name ?? user.username}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-(--bg-primary)">{(user.name || user.username).slice(0,2).toUpperCase()}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-(--text-primary) truncate">{user.name ?? '—'}</div>
        <div className="text-xs text-(--text-muted) truncate">@{user.username}</div>
      </div>
      <div className="flex items-center gap-2">
        {user.is_following ? (
          <span className="px-3 py-1 text-xs bg-(--bg-surface-2) text-(--text-muted) rounded-full">Following</span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); openProfile() }}
            className="px-3 py-1 bg-(--brand-yellow) text-(--bg-primary) rounded-full text-sm font-medium hover:bg-(--brand-yellow-soft)"
          >
            View
          </button>
        )}
      </div>
    </div>
  )
}
