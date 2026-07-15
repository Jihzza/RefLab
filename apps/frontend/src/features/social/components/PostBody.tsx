import React from 'react'
import { FileWarning } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MediaDisplay from './MediaDisplay'
import RepostBox from './RepostBox'
import type { Post } from '../types'

interface PostBodyProps {
  post: Post
  resolveMediaUrl?: (path: string) => string
}

/** Post content area: text + media, or embedded repost. */
const PostBody: React.FC<PostBodyProps> = ({ post, resolveMediaUrl }) => {
  const { t } = useTranslation()
  const isRepost = post.original_post_id !== null

  return (
    <div className="mt-3 sm:mt-4">
      {post.content && (
        <p className="whitespace-pre-wrap break-words text-[15px] leading-6 text-(--mc-color-text) sm:text-base sm:leading-7">
          {post.content}
        </p>
      )}

      {!isRepost && (
        <MediaDisplay
          mediaType={post.media_type}
          mediaUrl={post.media_url}
          mediaMetadata={post.media_metadata}
          resolveMediaUrl={resolveMediaUrl}
        />
      )}

      {isRepost && post.original_post ? (
        <RepostBox originalPost={post.original_post} resolveMediaUrl={resolveMediaUrl} />
      ) : isRepost && !post.original_post ? (
        <div className="mt-4 flex min-h-16 items-center gap-3 rounded-(--mc-radius-input) border border-dashed border-(--mc-color-border-strong) bg-(--mc-color-canvas) px-4 py-3 text-sm text-(--mc-color-text-muted)">
          <FileWarning className="size-5 shrink-0 text-(--mc-color-warning)" aria-hidden="true" />
          <span>{t('Original post was deleted')}</span>
        </div>
      ) : null}
    </div>
  )
}

export default PostBody
