import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Ellipsis, Flag, Heart, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Avatar from '@/components/ui/Avatar'
import IconButton from '@/components/ui/IconButton'
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

function formatRelativeTime(dateString: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000))
  if (seconds < 60) return 'now'
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
        className="rounded-sm font-semibold text-(--mc-color-accent) hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)"
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

/** Comment row with nested-reply styling and accessible moderation menu. */
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
  const menuContainerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const displayName = comment.author.name || comment.author.username
  const isOwnComment = comment.user_id === currentUserId

  const openAuthorProfile = () => {
    if (isOwnComment) {
      navigate('/app/profile')
      return
    }
    navigate(`/app/profile/${encodeURIComponent(comment.author.username)}`)
  }

  useEffect(() => {
    if (!menuOpen) return

    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[data-menu-item]')?.focus()
    })

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuContainerRef.current?.contains(event.target)
      ) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setMenuOpen(false)
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const item = menuRef.current?.querySelector<HTMLButtonElement>('[data-menu-item]')
    if (item && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      item.focus()
    }
  }

  const handleMenuAction = (action: () => void) => {
    setMenuOpen(false)
    action()
  }

  return (
    <article
      className={`flex min-w-0 gap-2.5 ${
        depth === 1
          ? 'ml-5 border-l border-(--mc-color-border) pl-3 sm:ml-10'
          : ''
      }`}
    >
      <button
        type="button"
        onClick={openAuthorProfile}
        aria-label={t('Open {{name}} profile', { name: displayName })}
        className="-m-1 mt-0 inline-flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)"
      >
        <Avatar
          src={comment.author.photo_url}
          ownerId={comment.author.id}
          alt={displayName}
          name={displayName}
          size="sm"
        />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex min-h-8 items-start gap-2">
          <button
            type="button"
            onClick={openAuthorProfile}
            className="min-w-0 truncate rounded-sm text-left text-xs font-bold text-(--mc-color-text) hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)"
          >
            {displayName}
          </button>
          <time
            dateTime={comment.created_at}
            className="shrink-0 text-[11px] tabular-nums text-(--mc-color-text-muted)"
          >
            {formatRelativeTime(comment.created_at)}
          </time>

          <div
            ref={menuContainerRef}
            className="relative ml-auto -mt-2 shrink-0"
            onBlur={(event) => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                setMenuOpen(false)
              }
            }}
          >
            <IconButton
              ref={triggerRef}
              size="md"
              label={t('Comment options')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuId : undefined}
              onClick={() => setMenuOpen((value) => !value)}
              className="size-11"
            >
              <Ellipsis className="size-4" />
            </IconButton>

            {menuOpen && (
              <div
                ref={menuRef}
                id={menuId}
                role="menu"
                aria-label={t('Comment options')}
                onKeyDown={handleMenuKeyDown}
                className="absolute right-0 top-[calc(100%+0.125rem)] z-30 w-40 overflow-hidden rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) p-1 shadow-(--mc-shadow-raised)"
              >
                {isOwnComment ? (
                  <button
                    type="button"
                    role="menuitem"
                    data-menu-item=""
                    onClick={() => handleMenuAction(() => onDelete(comment.id))}
                    className="flex min-h-11 w-full items-center gap-2 rounded-(--mc-radius-compact) px-3 text-left text-xs font-semibold text-(--mc-color-danger) transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:bg-(--mc-color-surface-hover) motion-reduce:transition-none"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t('Delete')}
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    data-menu-item=""
                    onClick={() => handleMenuAction(() => onReport(comment.id))}
                    className="flex min-h-11 w-full items-center gap-2 rounded-(--mc-radius-compact) px-3 text-left text-xs font-semibold text-(--mc-color-text-secondary) transition-colors hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text) focus-visible:outline-none focus-visible:bg-(--mc-color-surface-hover) motion-reduce:transition-none"
                  >
                    <Flag className="size-4" aria-hidden="true" />
                    {t('Report')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="-mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-(--mc-color-text-secondary)">
          {renderContentWithMentions(comment.content, navigate)}
        </p>

        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onLike(comment.id, comment.is_liked)}
            aria-pressed={comment.is_liked}
            aria-label={comment.is_liked ? t('Unlike comment') : t('Like comment')}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-(--mc-radius-compact) px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none ${
              comment.is_liked
                ? 'text-(--mc-color-danger)'
                : 'text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-danger)'
            }`}
          >
            <Heart
              className="size-4"
              fill={comment.is_liked ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            {comment.like_count > 0 && (
              <span className="tabular-nums">{comment.like_count}</span>
            )}
          </button>

          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="min-h-11 rounded-(--mc-radius-compact) px-2 text-xs font-semibold text-(--mc-color-text-muted) transition-colors hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-info) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none"
              aria-label={t('Reply to comment')}
            >
              {t('Reply')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
