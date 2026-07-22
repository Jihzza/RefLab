import MediaDisplay from './MediaDisplay'
import RepostBox from './RepostBox'
import type { Post } from '../types'

interface PostBodyProps {
  post: Post
}

/** Post content area: text + media, or embedded repost. */
const PostBody = ({ post }: PostBodyProps) => {
  const isRepost = post.original_post_id !== null

  return (
    <div className="mt-4">
      {/* Text content */}
      {post.content && (
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-(--mc-color-text)">
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
        <div className="mt-3 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas) p-4 text-sm italic text-(--mc-color-text-muted)">
          Original post was deleted
        </div>
      ) : null}
    </div>
  )
}

export default PostBody
