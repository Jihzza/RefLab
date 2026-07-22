import { Bookmark, Heart, MessageCircle, Repeat2, Share2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Post } from '../types'

interface PostFooterProps {
  post: Post
  onLike: () => void
  onComment: () => void
  onRepost: () => void
  onSave: () => void
  onShare: () => void
}

function formatCount(count: number): string {
  if (count === 0) return ''
  if (count < 1000) return count.toString()
  return `${(count / 1000).toFixed(1)}k`
}

interface ActionProps {
  label: string
  count?: number
  active?: boolean
  activeClassName?: string
  hoverClassName?: string
  onClick: () => void
  children: ReactNode
}

function PostAction({
  active = false,
  activeClassName = 'text-(--mc-color-accent)',
  children,
  count = 0,
  hoverClassName = 'hover:text-(--mc-color-text)',
  label,
  onClick,
}: ActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mc-focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-(--mc-radius-button) px-2 text-xs font-semibold transition-colors hover:bg-(--mc-color-surface-hover) ${
        active ? activeClassName : `text-(--mc-color-text-muted) ${hoverClassName}`
      }`}
      aria-label={label}
      aria-pressed={active || undefined}
    >
      {children}
      {count > 0 && <span className="mc-tabular">{formatCount(count)}</span>}
    </button>
  )
}

export default function PostFooter({
  post,
  onLike,
  onComment,
  onRepost,
  onSave,
  onShare,
}: PostFooterProps) {
  const { t } = useTranslation()

  return (
    <footer className="mt-4 grid grid-cols-5 border-t border-(--mc-color-border) pt-2">
      <PostAction
        label={post.is_liked ? t('Unlike post') : t('Like post')}
        count={post.like_count}
        active={post.is_liked}
        activeClassName="text-(--mc-color-danger)"
        hoverClassName="hover:text-(--mc-color-danger)"
        onClick={onLike}
      >
        <Heart className="size-5" fill={post.is_liked ? 'currentColor' : 'none'} aria-hidden="true" />
      </PostAction>

      <PostAction label={t('Comments')} count={post.comment_count} hoverClassName="hover:text-(--mc-color-info)" onClick={onComment}>
        <MessageCircle className="size-5" aria-hidden="true" />
      </PostAction>

      <PostAction
        label={post.is_reposted ? t('Undo repost') : t('Repost')}
        count={post.repost_count}
        active={post.is_reposted}
        activeClassName="text-(--mc-color-success)"
        hoverClassName="hover:text-(--mc-color-success)"
        onClick={onRepost}
      >
        <Repeat2 className="size-5" aria-hidden="true" />
      </PostAction>

      <PostAction
        label={post.is_saved ? t('Unsave post') : t('Save post')}
        count={post.save_count}
        active={post.is_saved}
        onClick={onSave}
      >
        <Bookmark className="size-5" fill={post.is_saved ? 'currentColor' : 'none'} aria-hidden="true" />
      </PostAction>

      <PostAction label={t('Share post')} onClick={onShare}>
        <Share2 className="size-5" aria-hidden="true" />
      </PostAction>
    </footer>
  )
}
