import React, { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { useComments } from '../hooks/useComments'
import CommentBox from './CommentBox'

interface CommentSectionProps {
  postId: string
  onCommentCountChange?: (delta: number) => void
}

/** Inline comment section that appears below a post. */
const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  onCommentCountChange,
}) => {
  const { user } = useAuth()
  const {
    comments,
    isLoading,
    fetchComments,
    addComment,
    toggleLike,
    deleteComment,
    reportComment,
  } = useComments(postId)

  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch comments on mount
  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newComment.trim()
    if (!text || isSubmitting) return

    setIsSubmitting(true)
    await addComment(text, replyingTo || undefined)
    setNewComment('')
    setReplyingTo(null)
    setIsSubmitting(false)
    onCommentCountChange?.(1)
  }

  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId)
    onCommentCountChange?.(-1)
  }

  const handleReply = (parentCommentId: string) => {
    setReplyingTo(parentCommentId)
  }

  if (!user) return null

  return (
    <div className="border-t border-(--border-subtle) mt-3 pt-3">
      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <div className="flex-1">
          {replyingTo && (
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[11px] text-(--text-muted)">
                Replying to comment
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-[11px] text-(--info) hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
            className="w-full px-3 py-2 text-sm bg-(--bg-surface-2) border border-(--border-subtle) rounded-(--radius-input) text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-1 focus:ring-(--brand-yellow)"
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className="px-3 py-2 text-sm font-medium bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors disabled:opacity-40"
        >
          Post
        </button>
      </form>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-3">
        {comments.map(comment => (
          <div key={comment.id}>
            <CommentBox
              comment={comment}
              currentUserId={user.id}
              depth={0}
              onLike={toggleLike}
              onReply={() => handleReply(comment.id)}
              onDelete={handleDelete}
              onReport={reportComment}
            />
            {/* Nested replies */}
            {comment.replies.length > 0 && (
              <div className="space-y-3 mt-3">
                {comment.replies.map(reply => (
                  <CommentBox
                    key={reply.id}
                    comment={reply}
                    currentUserId={user.id}
                    depth={1}
                    onLike={toggleLike}
                    onReply={() => handleReply(comment.id)}
                    onDelete={handleDelete}
                    onReport={reportComment}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!isLoading && comments.length === 0 && (
        <p className="text-center text-(--text-muted) text-xs py-2">
          No comments yet. Be the first!
        </p>
      )}
    </div>
  )
}

export default CommentSection
