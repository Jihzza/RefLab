import React from 'react'
import MediaDisplay from './MediaDisplay'
import RepostBox from './RepostBox'
import type { Post } from '../types'

interface PostBodyProps {
  post: Post
}

/** Post content area: text + media, or embedded repost. */
const PostBody: React.FC<PostBodyProps> = ({ post }) => {
  const isRepost = post.original_post_id !== null

  return (
    <div className="mt-3">
      {/* Text content */}
      {post.content && (
        <p className="text-(--text-primary) text-sm whitespace-pre-wrap break-words">
          {post.content}
        </p>
      )}

      {/* Media (only for non-repost posts) */}
      {!isRepost && (
        <MediaDisplay
          mediaType={post.media_type}
          mediaUrl={post.media_url}
          mediaMetadata={post.media_metadata}
        />
      )}

      {/* Embedded original post for reposts */}
      {isRepost && post.original_post ? (
        <RepostBox originalPost={post.original_post} />
      ) : isRepost && !post.original_post ? (
        <div className="mt-3 p-3 bg-(--bg-surface-2) rounded-lg border border-(--border-subtle) text-(--text-muted) text-sm italic">
          Original post was deleted
        </div>
      ) : null}
    </div>
  )
}

export default PostBody
