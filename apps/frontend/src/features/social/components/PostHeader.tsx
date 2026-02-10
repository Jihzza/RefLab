import React from 'react'
import PostMenu from './PostMenu'
import type { PostAuthor } from '../types'

interface PostHeaderProps {
  author: PostAuthor
  createdAt: string
  isOwnPost: boolean
  onReportPost: () => void
  onReportUser: () => void
  onBlockUser: () => void
  onDelete: () => void
}

/** Formats a timestamp into a relative time string (e.g. "5m", "2h", "3d"). */
function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

/** Post header with avatar, name, timestamp, and options menu. */
const PostHeader: React.FC<PostHeaderProps> = ({
  author,
  createdAt,
  isOwnPost,
  onReportPost,
  onReportUser,
  onBlockUser,
  onDelete,
}) => {
  const displayName = author.name || author.username
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      {author.photo_url ? (
        <img
          src={author.photo_url}
          alt={displayName}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-(--bg-primary)">
            {initials}
          </span>
        </div>
      )}

      {/* Name + username + timestamp */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-(--text-primary) text-sm truncate">
            {displayName}
          </span>
          <span className="text-(--text-muted) text-xs truncate">
            @{author.username}
          </span>
        </div>
        <span className="text-(--text-muted) text-xs">
          {formatRelativeTime(createdAt)}
        </span>
      </div>

      {/* Options menu */}
      <PostMenu
        isOwnPost={isOwnPost}
        onReportPost={onReportPost}
        onReportUser={onReportUser}
        onBlockUser={onBlockUser}
        onDelete={onDelete}
      />
    </div>
  )
}

export default PostHeader
