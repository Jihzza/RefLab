import { useState, type ReactNode } from 'react'
import { Flag, Heart, MoreHorizontal, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

function formatRelativeTime(dateString: string, nowLabel: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return nowLabel
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

function renderContentWithMentions(
  content: string,
  navigate: ReturnType<typeof useNavigate>,
): ReactNode[] {
  const mentionRegex = /@([a-z0-9_.]{3,30})/gi
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index))
    const username = match[1]
    parts.push(
      <button
        key={match.index}
        type="button"
        className="mc-focus-ring inline rounded font-semibold text-(--mc-color-accent) hover:underline"
        onClick={(event) => {
          event.stopPropagation()
          navigate(`/app/profile/${encodeURIComponent(username)}`)
        }}
      >
        @{username}
      </button>,
    )
    lastIndex = mentionRegex.lastIndex
  }

  if (lastIndex < content.length) parts.push(content.slice(lastIndex))
  return parts
}

export default function CommentBox({
  comment,
  currentUserId,
  depth,
  onLike,
  onReply,
  onDelete,
  onReport,
}: CommentBoxProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = comment.author.name || comment.author.username
  const initials = displayName.slice(0, 2).toUpperCase()
  const isOwnComment = comment.user_id === currentUserId

  const openProfile = () => {
    const route = isOwnComment
      ? '/app/profile'
      : `/app/profile/${encodeURIComponent(comment.author.username)}`
    navigate(route)
  }

  return (
    <article className="flex min-w-0 gap-2.5" data-depth={depth}>
      <button
        type="button"
        onClick={openProfile}
        className="mc-focus-ring mt-0.5 size-9 shrink-0 overflow-hidden rounded-full"
        aria-label={t('Open {{name}} profile', { name: displayName })}
      >
        {comment.author.photo_url ? (
          <img
            src={comment.author.photo_url}
            alt=""
            className="size-full border border-(--mc-color-border) object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center border border-(--mc-color-accent)/35 bg-(--mc-color-accent)/15 text-[10px] font-bold text-(--mc-color-accent)">
            {initials}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1 rounded-(--mc-radius-input) bg-(--mc-color-canvas) px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={openProfile}
              className="mc-focus-ring max-w-full truncate rounded text-xs font-semibold text-(--mc-color-text) hover:underline"
            >
              {displayName}
            </button>
            <span className="ml-2 text-[10px] tabular-nums text-(--mc-color-text-muted)">
              {formatRelativeTime(comment.created_at, t('now'))}
            </span>
          </div>

          <div className="relative -mr-1 -mt-1 shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="mc-focus-ring inline-flex size-9 items-center justify-center rounded-(--mc-radius-button) text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
              aria-label={t('Comment options')}
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-(--mc-z-sticky) cursor-default"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t('Close comment options')}
                />
                <div className="absolute right-0 top-9 z-(--mc-z-popover) min-w-40 overflow-hidden rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) p-1 shadow-(--mc-shadow-raised)" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      if (isOwnComment) onDelete(comment.id)
                      else onReport(comment.id)
                    }}
                    className={`mc-focus-ring flex min-h-11 w-full items-center gap-2 rounded-(--mc-radius-compact) px-3 py-2 text-left text-sm font-medium hover:bg-(--mc-color-surface-hover) ${isOwnComment ? 'text-(--mc-color-danger)' : 'text-(--mc-color-text-secondary)'}`}
                  >
                    {isOwnComment ? <Trash2 className="size-4" aria-hidden="true" /> : <Flag className="size-4" aria-hidden="true" />}
                    {isOwnComment ? t('Delete') : t('Report')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-(--mc-color-text-secondary)">
          {renderContentWithMentions(comment.content, navigate)}
        </p>

        <div className="mt-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onLike(comment.id, comment.is_liked)}
            className={`mc-focus-ring inline-flex min-h-9 items-center gap-1 rounded-(--mc-radius-button) px-2 text-[11px] font-semibold transition-colors hover:bg-(--mc-color-surface-hover) ${comment.is_liked ? 'text-(--mc-color-danger)' : 'text-(--mc-color-text-muted) hover:text-(--mc-color-danger)'}`}
            aria-label={comment.is_liked ? t('Unlike comment') : t('Like comment')}
            aria-pressed={comment.is_liked}
          >
            <Heart className="size-3.5" fill={comment.is_liked ? 'currentColor' : 'none'} aria-hidden="true" />
            {comment.like_count > 0 && <span>{comment.like_count}</span>}
          </button>

          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="mc-focus-ring min-h-9 rounded-(--mc-radius-button) px-2 text-[11px] font-semibold text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-info)"
            >
              {t('Reply')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
