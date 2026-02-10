import React from 'react'
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
  const displayName = originalPost.author.name || originalPost.author.username
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="mt-3 p-3 bg-(--bg-surface-2) rounded-lg border border-(--border-subtle)">
      {/* Original author */}
      <div className="flex items-center gap-2 mb-2">
        {originalPost.author.photo_url ? (
          <img
            src={originalPost.author.photo_url}
            alt={displayName}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-(--brand-yellow) flex items-center justify-center">
            <span className="text-[10px] font-semibold text-(--bg-primary)">
              {initials}
            </span>
          </div>
        )}
        <span className="text-xs font-medium text-(--text-primary)">
          {displayName}
        </span>
        <span className="text-xs text-(--text-muted)">
          @{originalPost.author.username}
        </span>
      </div>

      {/* Original content */}
      {originalPost.content && (
        <p className="text-(--text-primary) text-sm whitespace-pre-wrap break-words">
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
