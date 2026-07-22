import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'
import MediaDisplay from './MediaDisplay'
import type { Post, PostAuthor } from '../types'
import { Surface } from '@/components/ui'
import { useTranslation } from 'react-i18next'

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
}

/** Embedded card showing the original post within a repost. */
const RepostBox = ({ originalPost }: RepostBoxProps) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const displayName = originalPost.author.name || originalPost.author.username
  const initials = displayName.slice(0, 2).toUpperCase()

  const openAuthorProfile = () => {
    const isSelf = user?.id === originalPost.author.id
    if (isSelf) {
      navigate('/app/profile')
      return
    }

    navigate(`/app/profile/${encodeURIComponent(originalPost.author.username)}`)
  }

  return (
    <Surface className="mt-4" padding="sm" variant="inset">
      {/* Original author */}
      <button
        type="button"
        onClick={openAuthorProfile}
        className="mc-focus-ring -m-1 mb-2 flex min-h-10 items-center gap-2 rounded-(--mc-radius-button) p-1 text-left transition-colors hover:bg-(--mc-color-surface-hover)"
        aria-label={t('Open {{name}} profile', { name: displayName })}
      >
        {originalPost.author.photo_url ? (
          <img
            src={originalPost.author.photo_url}
            alt={displayName}
            className="size-7 rounded-full border border-(--mc-color-border) object-cover"
          />
        ) : (
          <div className="flex size-7 items-center justify-center rounded-full bg-(--mc-color-accent)/15">
            <span className="text-[10px] font-bold text-(--mc-color-accent)">
              {initials}
            </span>
          </div>
        )}
        <span className="text-xs font-semibold text-(--mc-color-text)">
          {displayName}
        </span>
        <span className="text-xs text-(--mc-color-text-muted)">
          @{originalPost.author.username}
        </span>
      </button>

      {/* Original content */}
      {originalPost.content && (
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-(--mc-color-text)">
          {originalPost.content}
        </p>
      )}

      {/* Original media */}
      <MediaDisplay
        mediaType={originalPost.media_type}
        mediaUrl={originalPost.media_url}
        mediaMetadata={originalPost.media_metadata}
      />
    </Surface>
  )
}

export default RepostBox
