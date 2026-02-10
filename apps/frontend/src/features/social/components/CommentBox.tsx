import React, { useState } from 'react'
import type { Comment } from '../types'

interface CommentBoxProps {
  comment: Comment
  currentUserId: string
  depth: number
  onLike: (commentId: string, isLiked: boolean) => void
  onReply?: () => void
  onDelete: (commentId: string) => void
  onReport: (commentId: string) => void
}

/** Formats a timestamp into a relative time string. */
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
  return `${Math.floor(days / 30)}mo`
}

/** Single comment with avatar, content, like button, and optional reply button. */
const CommentBox: React.FC<CommentBoxProps> = ({
  comment,
  currentUserId,
  depth,
  onLike,
  onReply,
  onDelete,
  onReport,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = comment.author.name || comment.author.username
  const initials = displayName.slice(0, 2).toUpperCase()
  const isOwnComment = comment.user_id === currentUserId

  return (
    <div className={`flex gap-2 ${depth === 1 ? 'ml-10' : ''}`}>
      {/* Avatar */}
      {comment.author.photo_url ? (
        <img
          src={comment.author.photo_url}
          alt={displayName}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-semibold text-(--bg-primary)">
            {initials}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-(--text-primary)">
            {displayName}
          </span>
          <span className="text-[10px] text-(--text-muted)">
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>

        <p className="text-sm text-(--text-primary) mt-0.5 break-words">
          {comment.content}
        </p>

        {/* Actions row */}
        <div className="flex items-center gap-4 mt-1.5">
          {/* Like */}
          <button
            onClick={() => onLike(comment.id, comment.is_liked)}
            className={`flex items-center gap-1 text-[11px] transition-colors ${
              comment.is_liked
                ? 'text-(--error)'
                : 'text-(--text-muted) hover:text-(--error)'
            }`}
            aria-label={comment.is_liked ? 'Unlike comment' : 'Like comment'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24"
              fill={comment.is_liked ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth={comment.is_liked ? 0 : 2}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
            {comment.like_count > 0 && <span>{comment.like_count}</span>}
          </button>

          {/* Reply */}
          {onReply && (
            <button
              onClick={onReply}
              className="text-[11px] text-(--text-muted) hover:text-(--info) transition-colors"
              aria-label="Reply to comment"
            >
              Reply
            </button>
          )}

          {/* 3-dot menu */}
          <div className="relative ml-auto">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-0.5 text-(--text-muted) hover:text-(--text-secondary) transition-colors"
              aria-label="Comment options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-6 z-50 w-36 bg-(--bg-surface) border border-(--border-subtle) rounded-lg shadow-xl overflow-hidden">
                  {isOwnComment ? (
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(comment.id) }}
                      className="w-full text-left px-3 py-2 text-xs text-(--error) hover:bg-(--bg-hover) transition-colors"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMenuOpen(false); onReport(comment.id) }}
                      className="w-full text-left px-3 py-2 text-xs text-(--text-secondary) hover:bg-(--bg-hover) transition-colors"
                    >
                      Report
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommentBox
