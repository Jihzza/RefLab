import React from 'react'
import type { Post } from '../types'

interface PostFooterProps {
  post: Post
  onLike: () => void
  onComment: () => void
  onRepost: () => void
  onSave: () => void
  onShare: () => void
}

/** Format count for display (e.g. 1200 -> "1.2k"). */
function formatCount(count: number): string {
  if (count === 0) return ''
  if (count < 1000) return count.toString()
  return `${(count / 1000).toFixed(1)}k`
}

/** Post interaction bar with like, comment, repost, save, share buttons. */
const PostFooter: React.FC<PostFooterProps> = ({
  post,
  onLike,
  onComment,
  onRepost,
  onSave,
  onShare,
}) => {
  return (
    <div className="flex items-center justify-between pt-3 mt-3 border-t border-(--border-subtle)">
      {/* Like */}
      <button
        onClick={onLike}
        className={`flex items-center gap-1 text-xs transition-colors ${
          post.is_liked
            ? 'text-(--error)'
            : 'text-(--text-muted) hover:text-(--error)'
        }`}
        aria-label={post.is_liked ? 'Unlike post' : 'Like post'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24"
          fill={post.is_liked ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth={post.is_liked ? 0 : 1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
        <span>{formatCount(post.like_count)}</span>
      </button>

      {/* Comment */}
      <button
        onClick={onComment}
        className="flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--info) transition-colors"
        aria-label="Comments"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
          />
        </svg>
        <span>{formatCount(post.comment_count)}</span>
      </button>

      {/* Repost */}
      <button
        onClick={onRepost}
        className={`flex items-center gap-1 text-xs transition-colors ${
          post.is_reposted
            ? 'text-(--success)'
            : 'text-(--text-muted) hover:text-(--success)'
        }`}
        aria-label={post.is_reposted ? 'Undo repost' : 'Repost'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
          />
        </svg>
        <span>{formatCount(post.repost_count)}</span>
      </button>

      {/* Save */}
      <button
        onClick={onSave}
        className={`flex items-center gap-1 text-xs transition-colors ${
          post.is_saved
            ? 'text-(--brand-yellow)'
            : 'text-(--text-muted) hover:text-(--brand-yellow)'
        }`}
        aria-label={post.is_saved ? 'Unsave post' : 'Save post'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24"
          fill={post.is_saved ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth={post.is_saved ? 0 : 1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
          />
        </svg>
        <span>{formatCount(post.save_count)}</span>
      </button>

      {/* Share */}
      <button
        onClick={onShare}
        className="flex items-center gap-1 text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors"
        aria-label="Share post"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
          />
        </svg>
      </button>
    </div>
  )
}

export default PostFooter
