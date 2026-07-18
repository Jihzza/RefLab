import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Avatar from '@/components/ui/Avatar'
import Surface from '@/components/ui/Surface'
import { useAuth } from '@/features/auth/components/useAuth'
import MediaDisplay from './MediaDisplay'
import type { Post, PostAuthor } from '../types'

interface OriginalPostData {
  id: string
  content: string | null
  media_type: Post['media_type']
  media_url: string | null
  media_metadata: Post['media_metadata']
  created_at: string
  author: PostAuthor
}

interface RepostBoxProps {
  originalPost: OriginalPostData
  resolveMediaUrl?: (path: string) => string
}

/** Embedded card showing the original post within a repost. */
const RepostBox: React.FC<RepostBoxProps> = ({ originalPost, resolveMediaUrl }) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const displayName = originalPost.author.name || originalPost.author.username

  const openAuthorProfile = () => {
    const isSelf = user?.id === originalPost.author.id
    if (isSelf) {
      navigate('/app/profile')
      return
    }

    navigate(`/app/profile/${encodeURIComponent(originalPost.author.username)}`)
  }

  return (
    <Surface variant="inset" padding="sm" className="mt-4 overflow-hidden sm:p-4">
      <button
        type="button"
        onClick={openAuthorProfile}
        className="-m-1 mb-2 flex min-h-11 max-w-full items-center gap-2 rounded-(--mc-radius-button) p-1 text-left transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none"
        aria-label={t('Open {{name}} profile', { name: displayName })}
      >
        <Avatar
          src={originalPost.author.photo_url}
          ownerId={originalPost.author.id}
          alt={displayName}
          name={displayName}
          size="sm"
        />
        <span className="truncate text-sm font-semibold text-(--mc-color-text)">
          {displayName}
        </span>
        <span className="truncate text-xs text-(--mc-color-text-muted)">
          @{originalPost.author.username}
        </span>
      </button>

      {originalPost.content && (
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-(--mc-color-text)">
          {originalPost.content}
        </p>
      )}

      <MediaDisplay
        mediaType={originalPost.media_type}
        mediaUrl={originalPost.media_url}
        mediaMetadata={originalPost.media_metadata}
        resolveMediaUrl={resolveMediaUrl}
      />
    </Surface>
  )
}

export default RepostBox
