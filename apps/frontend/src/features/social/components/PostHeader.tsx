import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Avatar from '@/components/ui/Avatar'
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
const PostHeader: React.FC<PostHeaderProps> = ({
  author,
  createdAt,
  isOwnPost,
  onReportPost,
  onReportUser,
  onBlockUser,
  onDelete,
}) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const displayName = author.name || author.username

  const openAuthorProfile = () => {
    const isSelf = user?.id === author.id
    if (isSelf) {
      navigate('/app/profile')
      return
    }

    navigate(`/app/profile/${encodeURIComponent(author.username)}`)
  }

  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        onClick={openAuthorProfile}
        className="-m-1 flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-(--mc-radius-button) p-1 text-left transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none"
        aria-label={t('Open {{name}} profile', { name: displayName })}
      >
        <Avatar
          src={author.photo_url}
          alt={displayName}
          name={displayName}
          size="lg"
          className="ring-1 ring-black/20"
        />

        <div className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold leading-5 text-(--mc-color-text)">
            {displayName}
          </span>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-(--mc-color-text-muted)">
            <span className="truncate">@{author.username}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={createdAt} className="shrink-0 tabular-nums">
              {formatRelativeTime(createdAt)}
            </time>
          </div>
        </div>
      </button>

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
