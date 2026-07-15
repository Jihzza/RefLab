import React from 'react'
import { Bookmark, Heart, MessageCircle, Repeat2, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Post } from '../types'

interface PostFooterProps {
  post: Post
  commentsExpanded: boolean
  commentsId: string
  onLike: () => void
  onComment: () => void
  onRepost: () => void
  onSave: () => void
  onShare: () => void
}

function formatCount(count: number): string {
  if (count === 0) return ''
  if (count < 1000) return count.toString()
  if (count < 1_000_000) return `${Number((count / 1000).toFixed(1))}k`
  return `${Number((count / 1_000_000).toFixed(1))}m`
}

/** Match Control interaction rail with full-size, keyboard-visible targets. */
const PostFooter: React.FC<PostFooterProps> = ({
  post,
  commentsExpanded,
  commentsId,
  onLike,
  onComment,
  onRepost,
  onSave,
  onShare,
}) => {
  const { t } = useTranslation()
  const actionClassName =
    'group flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-(--mc-radius-button) px-1 text-xs font-medium text-(--mc-color-text-muted) transition-colors hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none'

  return (
    <div className="mt-4 grid grid-cols-5 border-t border-(--mc-color-border) pt-2">
      <button
        type="button"
        onClick={onLike}
        aria-pressed={post.is_liked}
        aria-label={post.is_liked ? t('Unlike post') : t('Like post')}
        className={`${actionClassName} ${
          post.is_liked
            ? 'text-(--mc-color-danger) hover:text-(--mc-color-danger)'
            : 'hover:text-(--mc-color-danger)'
        }`}
      >
        <Heart
          className="size-[21px] shrink-0"
          fill={post.is_liked ? 'currentColor' : 'none'}
          strokeWidth={post.is_liked ? 2.25 : 1.8}
          aria-hidden="true"
        />
        <span className="truncate tabular-nums">{formatCount(post.like_count)}</span>
      </button>

      <button
        type="button"
        onClick={onComment}
        aria-expanded={commentsExpanded}
        aria-controls={commentsId}
        aria-label={t('Comments')}
        className={`${actionClassName} ${
          commentsExpanded ? 'text-(--mc-color-info)' : 'hover:text-(--mc-color-info)'
        }`}
      >
        <MessageCircle className="size-[21px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span className="truncate tabular-nums">{formatCount(post.comment_count)}</span>
      </button>

      <button
        type="button"
        onClick={onRepost}
        aria-pressed={post.is_reposted}
        aria-label={post.is_reposted ? t('Undo repost') : t('Repost')}
        className={`${actionClassName} ${
          post.is_reposted
            ? 'text-(--mc-color-success) hover:text-(--mc-color-success)'
            : 'hover:text-(--mc-color-success)'
        }`}
      >
        <Repeat2 className="size-[22px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <span className="truncate tabular-nums">{formatCount(post.repost_count)}</span>
      </button>

      <button
        type="button"
        onClick={onSave}
        aria-pressed={post.is_saved}
        aria-label={post.is_saved ? t('Unsave post') : t('Save post')}
        className={`${actionClassName} ${
          post.is_saved
            ? 'text-(--mc-color-accent) hover:text-(--mc-color-accent)'
            : 'hover:text-(--mc-color-accent)'
        }`}
      >
        <Bookmark
          className="size-[21px] shrink-0"
          fill={post.is_saved ? 'currentColor' : 'none'}
          strokeWidth={post.is_saved ? 2.25 : 1.8}
          aria-hidden="true"
        />
        <span className="truncate tabular-nums">{formatCount(post.save_count)}</span>
      </button>

      <button
        type="button"
        onClick={onShare}
        aria-label={t('Share post')}
        className={actionClassName}
      >
        <Share2 className="size-[21px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  )
}

export default PostFooter
