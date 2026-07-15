import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { AlertCircle, LoaderCircle, MessageCircle, Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/components/useAuth'
import { useComments } from '../hooks/useComments'
import CommentBox from './CommentBox'
import MentionDropdown from './MentionDropdown'

interface CommentSectionProps {
  id?: string
  postId: string
  onCommentCountChange?: (delta: number) => void
}

/** Inline comments, nested replies, moderation and @mention composition. */
export default function CommentSection({
  id,
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
  const inputRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLFormElement>(null)
  const mentionListId = `${id ?? `post-${postId}-comments`}-mentions`

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  useEffect(() => {
    if (mentionQuery === null) return

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !composerRef.current?.contains(event.target)
      ) {
        setMentionQuery(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [mentionQuery])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const text = newComment.trim()
    if (!text || isSubmitting) return

    setIsSubmitting(true)
    try {
      const added = await addComment(text, replyingTo || undefined)
      if (!added) return

      setNewComment('')
      setReplyingTo(null)
      setMentionQuery(null)
      onCommentCountChange?.(1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    const deleted = await deleteComment(commentId)
    if (deleted) onCommentCountChange?.(-1)
  }

  const handleReply = (parentCommentId: string) => {
    setReplyingTo(parentCommentId)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const detectMention = (value: string, cursorPosition: number) => {
    const textBeforeCursor = value.slice(0, cursorPosition)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex === -1 || (atIndex > 0 && !/\s/.test(textBeforeCursor[atIndex - 1]))) {
      setMentionQuery(null)
      return
    }

    const queryText = textBeforeCursor.slice(atIndex + 1)
    if (/\s/.test(queryText)) {
      setMentionQuery(null)
      return
    }

    setMentionQuery(queryText)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
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
      setNewComment(updated)
      setMentionQuery(null)

      window.requestAnimationFrame(() => {
        input.focus()
        const position = atIndex + username.length + 2
        input.setSelectionRange(position, position)
      })
    },
    [newComment],
  )

  const handleMentionClose = useCallback(() => {
    setMentionQuery(null)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  if (!user) return null

  return (
    <section id={id} aria-label={t('Comments')} className="mt-1 border-t border-(--mc-color-border) pt-4">
      <form ref={composerRef} onSubmit={handleSubmit} className="mb-5">
        {replyingTo && (
          <div className="mb-2 flex min-h-11 items-center justify-between gap-3 rounded-(--mc-radius-compact) bg-(--mc-color-canvas) px-3">
            <span className="truncate text-xs text-(--mc-color-text-muted)">
              {t('Replying to comment')}
            </span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-(--mc-radius-compact) px-2 text-xs font-semibold text-(--mc-color-info) transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none"
            >
              <X className="size-4" aria-hidden="true" />
              {t('Cancel')}
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              value={newComment}
              onChange={handleInputChange}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && mentionQuery !== null) {
                  event.preventDefault()
                  setMentionQuery(null)
                }
              }}
              placeholder={replyingTo ? t('Write a reply...') : t('Add a comment...')}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={mentionQuery !== null}
              aria-controls={mentionQuery !== null ? mentionListId : undefined}
              className="min-h-12 w-full rounded-(--mc-radius-input) border border-(--mc-color-border-strong) bg-(--mc-color-canvas) px-4 py-3 text-sm text-(--mc-color-text) placeholder:text-(--mc-color-text-muted) focus:border-(--mc-color-accent) focus:outline-none focus:ring-2 focus:ring-(--mc-color-accent)/20"
            />
            {mentionQuery !== null && (
              <MentionDropdown
                id={mentionListId}
                query={mentionQuery}
                onSelect={handleMentionSelect}
                onClose={handleMentionClose}
              />
            )}
          </div>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!newComment.trim()}
            leadingIcon={<Send className="size-4" />}
            className="min-w-12 px-3 sm:min-w-24"
            aria-label={t('Post')}
          >
            <span className="hidden sm:inline">{t('Post')}</span>
          </Button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-(--mc-radius-input) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/10 p-3 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-start gap-2 text-sm text-(--mc-color-text-secondary)">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
            <span className="break-words">{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchComments}>
            {t('Try Again')}
          </Button>
        </div>
      )}

      {isLoading && (
        <div
          role="status"
          aria-label={t('Loading comments')}
          className="flex min-h-20 items-center justify-center"
        >
          <LoaderCircle className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" />
        </div>
      )}

      {!isLoading && comments.length > 0 && (
        <ul className="space-y-4" aria-label={t('Comments')}>
          {comments.map((comment) => (
            <li key={comment.id}>
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
                <ul className="mt-3 space-y-3">
                  {comment.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentBox
                        comment={reply}
                        currentUserId={user.id}
                        depth={1}
                        onLike={toggleLike}
                        onReply={() => handleReply(comment.id)}
                        onDelete={handleDelete}
                        onReport={reportComment}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !error && comments.length === 0 && (
        <div className="flex min-h-20 items-center justify-center gap-2 text-center text-xs text-(--mc-color-text-muted)">
          <MessageCircle className="size-4" aria-hidden="true" />
          <span>{t('No comments yet. Be the first!')}</span>
        </div>
      )}
    </section>
  )
}
