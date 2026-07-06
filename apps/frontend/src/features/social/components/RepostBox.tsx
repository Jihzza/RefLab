import React from 'react'
import { useNavigate } from 'react-router-dom'
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
}

/** Embedded card showing the original post within a repost. */
const RepostBox: React.FC<RepostBoxProps> = ({ originalPost }) => {
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
    <div className="mt-3 p-3 rounded-(--radius-card) border border-(--border-subtle) bg-(--bg-surface-2)/60">
      {/* Original author */}
      <button
        type="button"
        onClick={openAuthorProfile}
        className="group flex items-center gap-2 mb-2 text-left rounded-(--radius-button) hover:bg-(--bg-hover) transition-colors p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
        aria-label={`Open ${displayName} profile`}
      >
        {originalPost.author.photo_url ? (
          <img
            src={originalPost.author.photo_url}
            alt={displayName}
            className="w-6 h-6 rounded-full object-cover ring-1 ring-(--border-subtle)"
          />
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center ring-1 ring-white/10"
            style={{ backgroundImage: 'var(--grad-brand)' }}
          >
            <span className="text-[10px] font-bold text-(--bg-primary)">
              {initials}
            </span>
          </div>
        )}
        <span className="text-xs font-semibold text-(--text-primary) group-hover:text-(--brand-yellow) transition-colors">
          {displayName}
        </span>
        <span className="text-xs text-(--text-muted)">
          @{originalPost.author.username}
        </span>
      </button>

      {/* Original content */}
      {originalPost.content && (
        <p className="text-(--text-secondary) text-sm leading-relaxed whitespace-pre-wrap break-words">
          {originalPost.content}
        </p>
      )}

      {/* Original media */}
      <MediaDisplay
        mediaType={originalPost.media_type}
        mediaUrl={originalPost.media_url}
        mediaMetadata={originalPost.media_metadata}
      />
    </div>
  )
}

export default RepostBox
