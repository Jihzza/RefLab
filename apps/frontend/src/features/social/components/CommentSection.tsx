import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { useComments } from '../hooks/useComments'
import CommentBox from './CommentBox'
import MentionDropdown from './MentionDropdown'
import { useTranslation } from 'react-i18next'

interface CommentSectionProps {
  postId: string
  onCommentCountChange?: (delta: number) => void
}

/** Inline comment section that appears below a post. */
const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  onCommentCountChange,
}) => {
  const { t } = useTranslation()
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

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch comments on mount
  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newComment.trim()
    if (!text || isSubmitting) return

    setIsSubmitting(true)
    try {
      await addComment(text, replyingTo || undefined)
      setNewComment('')
      setReplyingTo(null)
      onCommentCountChange?.(1)
    } catch (err) {
      console.error('Failed to submit comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId)
    onCommentCountChange?.(-1)
  }

  const handleReply = (parentCommentId: string) => {
    setReplyingTo(parentCommentId)
  }

  // Detect @mention: scan backwards from cursor to find an @ preceded by space or start
  const detectMention = (value: string, cursorPos: number) => {
    const textBeforeCursor = value.slice(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex === -1) {
      setMentionQuery(null)
      return
    }

    // @ must be at position 0 or preceded by a space/newline
    if (atIndex > 0 && textBeforeCursor[atIndex - 1] !== ' ') {
      setMentionQuery(null)
      return
    }

    const queryText = textBeforeCursor.slice(atIndex + 1)

    // If the query contains a space, the mention is complete
    if (queryText.includes(' ')) {
      setMentionQuery(null)
      return
    }

    setMentionQuery(queryText)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewComment(value)
    detectMention(value, e.target.selectionStart ?? value.length)
  }

  // Insert selected username, replacing the @query text
  const handleMentionSelect = useCallback(
    (username: string) => {
      const input = inputRef.current
      if (!input) return

      const cursorPos = input.selectionStart ?? newComment.length
      const textBeforeCursor = newComment.slice(0, cursorPos)
      const atIndex = textBeforeCursor.lastIndexOf('@')

      if (atIndex === -1) return

      const before = newComment.slice(0, atIndex)
      const after = newComment.slice(cursorPos)
      const updated = `${before}@${username} ${after}`

      setNewComment(updated)
      setMentionQuery(null)

      // Restore focus and cursor position after the inserted mention
      requestAnimationFrame(() => {
        input.focus()
        const pos = atIndex + username.length + 2 // @username + space
        input.setSelectionRange(pos, pos)
      })
    },
    [newComment],
  )

  const handleMentionClose = useCallback(() => {
    setMentionQuery(null)
  }, [])

  if (!user) return null

  return (
    <div className="border-t border-(--border-subtle) mt-3 pt-3">
      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          {replyingTo && (
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[11px] text-(--text-muted)">
                {t('Replying to comment')}
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-[11px] text-(--info) hover:underline"
              >
                {t('Cancel')}
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={handleInputChange}
            placeholder={replyingTo ? t('Write a reply...') : t('Add a comment...')}
            className="w-full h-10 px-3.5 text-sm bg-(--bg-surface-2) border border-(--border-subtle) rounded-(--radius-input) text-(--text-primary) placeholder-(--text-faint) transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-(--brand-yellow) focus:shadow-[0_0_0_3px_rgba(246,194,28,0.16)]"
          />
          {mentionQuery !== null && (
            <MentionDropdown
              query={mentionQuery}
              onSelect={handleMentionSelect}
              onClose={handleMentionClose}
            />
          )}
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          style={newComment.trim() && !isSubmitting ? { backgroundImage: 'var(--grad-brand)' } : undefined}
          className="h-10 px-4 text-sm font-bold text-(--bg-primary) rounded-(--radius-button) shadow-[0_8px_24px_-8px_rgba(246,194,28,0.5)] transition-[filter,opacity] duration-150 hover:brightness-105 disabled:bg-(--bg-surface-2) disabled:text-(--text-faint) disabled:shadow-none disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
        >
          {t('Post')}
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
          {t('No comments yet. Be the first!')}
        </p>
      )}
    </div>
  )
}

export default CommentSection
