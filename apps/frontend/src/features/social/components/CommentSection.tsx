import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Skeleton, TextArea } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { useComments } from '../hooks/useComments'
import { COMMENT_MAX_CHARACTERS } from '../validation'
import CommentBox from './CommentBox'
import MentionDropdown from './MentionDropdown'

interface CommentSectionProps {
  postId: string
  onCommentCountChange?: (delta: number) => void
}

export default function CommentSection({
  postId,
  onCommentCountChange,
}: CommentSectionProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    comments,
    isLoading,
    error,
    fetchComments,
    addComment,
    toggleLike,
    deleteComment,
    reportComment,
  } = useComments(postId)

  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void fetchComments()
  }, [fetchComments])

  const submitComment = async () => {
    const text = newComment.trim()
    if (!text || isSubmitting) return

    setIsSubmitting(true)
    try {
      await addComment(text, replyingTo || undefined)
      setNewComment('')
      setReplyingTo(null)
      setMentionQuery(null)
      onCommentCountChange?.(1)
    } catch {
      inputRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submitComment()
  }

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId)
      onCommentCountChange?.(-1)
    } catch {
      // useComments restores the server state and exposes the failure inline.
    }
  }

  const handleReply = (parentCommentId: string) => {
    setReplyingTo(parentCommentId)
    inputRef.current?.focus()
  }

  const detectMention = (value: string, cursorPosition: number) => {
    const textBeforeCursor = value.slice(0, cursorPosition)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex === -1 || (atIndex > 0 && !/\s/.test(textBeforeCursor[atIndex - 1]))) {
      setMentionQuery(null)
      return
    }

    const queryText = textBeforeCursor.slice(atIndex + 1)
    setMentionQuery(/\s/.test(queryText) ? null : queryText)
  }

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value
    setNewComment(value)
    detectMention(value, event.target.selectionStart ?? value.length)
  }

  const handleMentionSelect = useCallback(
    (username: string) => {
      const input = inputRef.current
      if (!input) return

      const cursorPosition = input.selectionStart ?? newComment.length
      const textBeforeCursor = newComment.slice(0, cursorPosition)
      const atIndex = textBeforeCursor.lastIndexOf('@')
      if (atIndex === -1) return

      const updated = `${newComment.slice(0, atIndex)}@${username} ${newComment.slice(cursorPosition)}`
      setNewComment(updated.slice(0, COMMENT_MAX_CHARACTERS))
      setMentionQuery(null)

      requestAnimationFrame(() => {
        input.focus()
        const nextPosition = Math.min(atIndex + username.length + 2, COMMENT_MAX_CHARACTERS)
        input.setSelectionRange(nextPosition, nextPosition)
      })
    },
    [newComment],
  )

  if (!user) return null

  const charactersRemaining = COMMENT_MAX_CHARACTERS - newComment.length

  return (
    <section className="mt-4 border-t border-(--mc-color-border) pt-4" aria-label={t('Comments')}>
      <form onSubmit={handleSubmit} className="mb-5 space-y-2">
        {replyingTo && (
          <div className="flex items-center gap-2 rounded-(--mc-radius-input) bg-(--mc-color-info)/10 px-3 py-2 text-xs text-(--mc-color-info)">
            <span className="flex-1">{t('Replying to comment')}</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="mc-focus-ring inline-flex size-8 items-center justify-center rounded-(--mc-radius-button) hover:bg-(--mc-color-info)/10"
              aria-label={t('Cancel reply')}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/10 px-3 py-2 text-xs text-(--mc-color-danger)" role="alert">
            {error}
          </div>
        )}

        <div className="relative">
          <TextArea
            ref={inputRef}
            value={newComment}
            onChange={handleInputChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                void submitComment()
              }
            }}
            maxLength={COMMENT_MAX_CHARACTERS}
            placeholder={replyingTo ? t('Write a reply...') : t('Add a comment...')}
            rows={2}
            resize="none"
            className="min-h-20 pr-12"
            aria-describedby="comment-character-count"
          />
          {mentionQuery !== null && (
            <MentionDropdown
              query={mentionQuery}
              onSelect={handleMentionSelect}
              onClose={() => setMentionQuery(null)}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span id="comment-character-count" className="mc-tabular text-xs text-(--mc-color-text-muted)">
            {t('{{count}} characters remaining', { count: charactersRemaining })}
          </span>
          <Button
            type="submit"
            size="sm"
            loading={isSubmitting}
            loadingText={t('Posting...')}
            disabled={!newComment.trim()}
            trailingIcon={<Send className="size-4" />}
          >
            {t('Post')}
          </Button>
        </div>
      </form>

      {isLoading && (
        <div className="space-y-4 py-2" role="status" aria-label={t('Loading comments')}>
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton variant="circular" width="2rem" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="7rem" />
                <Skeleton variant="text" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
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
              {comment.replies.length > 0 && (
                <div className="mt-3 space-y-3 border-l border-(--mc-color-border) pl-3 sm:pl-4">
                  {comment.replies.map((reply) => (
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
      )}

      {!isLoading && comments.length === 0 && !error && (
        <EmptyState
          compact
          icon={<MessageCircle className="size-5" />}
          title={t('No comments yet')}
          description={t('Be the first to join the conversation.')}
        />
      )}
    </section>
  )
}
