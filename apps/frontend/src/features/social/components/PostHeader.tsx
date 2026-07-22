import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/components/useAuth'
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
const PostHeader = ({
  author,
  createdAt,
  isOwnPost,
  onReportPost,
  onReportUser,
  onBlockUser,
  onDelete,
}: PostHeaderProps) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const displayName = author.name || author.username
  const initials = displayName.slice(0, 2).toUpperCase()

  const openAuthorProfile = () => {
    const isSelf = user?.id === author.id
    if (isSelf) {
      navigate('/app/profile')
      return
    }

    navigate(`/app/profile/${encodeURIComponent(author.username)}`)
  }

  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        onClick={openAuthorProfile}
        className="mc-focus-ring -m-1 flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-(--mc-radius-button) p-1 text-left transition-colors hover:bg-(--mc-color-surface-hover)"
        aria-label={t('Open {{name}} profile', { name: displayName })}
      >
        {/* Avatar */}
        {author.photo_url ? (
          <img
            src={author.photo_url}
            alt={displayName}
            className="size-11 shrink-0 rounded-full border border-(--mc-color-border-strong) object-cover"
          />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-(--mc-color-accent)/40 bg-(--mc-color-accent)/15">
            <span className="text-sm font-bold text-(--mc-color-accent)">
              {initials}
            </span>
          </div>
        )}

        {/* Name + username + timestamp */}
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-sm font-semibold text-(--mc-color-text)">
              {displayName}
            </span>
            <span className="truncate text-xs text-(--mc-color-text-muted)">
              @{author.username}
            </span>
          </div>
          <span className="mt-0.5 block text-xs tabular-nums text-(--mc-color-text-muted)">
            {formatRelativeTime(createdAt)}
          </span>
        </div>
      </button>

      {/* Options menu */}
      <PostMenu
        isOwnPost={isOwnPost}
        onReportPost={onReportPost}
        onReportUser={onReportUser}
        onBlockUser={onBlockUser}
        onDelete={onDelete}
      />
    </header>
  )
}

export default PostHeader
