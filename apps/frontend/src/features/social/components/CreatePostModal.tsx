import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { createPost } from '../api/socialApi'
import type { Post, PostMediaType } from '../types'
import { useTranslation } from 'react-i18next'

interface CreatePostModalProps {
  onClose: () => void
  onPostCreated: (post: Post) => void
}

// Mirror the storage bucket's limits (backend/supabase/migrations/20260211_0001_social_tables.sql)
// so oversized/invalid files are rejected before an upload is attempted.
const MAX_MEDIA_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_MEDIA_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
]

/** Floating dialog for composing a new post with optional media upload. */
const CreatePostModal: React.FC<CreatePostModalProps> = ({
  onClose,
  onPostCreated,
}) => {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<PostMediaType>('text')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Close on Escape from anywhere in the document so it works even if focus
  // leaves the dialog (no focus trap yet).
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate before upload so the user gets a clear message instead of a
    // raw storage error after a long upload.
    if (!ALLOWED_MEDIA_MIME.includes(file.type)) {
      setError(t('Unsupported file type. Use an image, video, or audio file.'))
      e.target.value = ''
      return
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setError(t('File is too large. The maximum size is 50 MB.'))
      e.target.value = ''
      return
    }
    setError(null)

    const mime = file.type
    let type: PostMediaType = 'text'
    if (mime.startsWith('image/')) type = 'image'
    else if (mime.startsWith('video/')) type = 'video'
    else if (mime.startsWith('audio/')) type = 'audio'

    setMediaFile(file)
    setMediaType(type)

    if (type === 'image') {
      const reader = new FileReader()
      reader.onload = () => setMediaPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else if (type === 'video') {
      setMediaPreview(URL.createObjectURL(file))
    } else {
      setMediaPreview(file.name)
    }
  }, [t])

  const removeMedia = useCallback(() => {
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType('text')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleSubmit = async () => {
    if (!user?.id) {
      setError(t('You must be logged in to post.'))
      return
    }
    if (!profile) {
      setError(t('Your profile is still loading. Please try again.'))
      return
    }
    if (!content.trim() && !mediaFile) {
      setError(t('Please write something or attach media.'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { post, error: postError } = await createPost(
        user.id,
        content.trim() || null,
        mediaFile ? mediaType : 'text',
        mediaFile || undefined
      )

      if (postError) {
        setError(postError.message)
        setIsSubmitting(false)
        return
      }

      if (post) {
        const enrichedPost: Post = {
          ...post,
          author: {
            id: profile.id,
            username: profile.username,
            name: profile.name ?? null,
            photo_url: profile.photo_url ?? null,
          },
          original_post: null,
          is_liked: false,
          is_saved: false,
          is_reposted: false,
          like_count: 0,
          comment_count: 0,
          repost_count: 0,
          save_count: 0,
        }
        onPostCreated(enrichedPost)
      }

      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Something went wrong. Please try again.')
      setError(message)
      setIsSubmitting(false)
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const canSubmit = (content.trim() || mediaFile) && !isSubmitting

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-(--bg-primary)/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-post-title"
          className="w-full max-w-lg bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-xl pointer-events-auto flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-subtle)">
            <h2 id="create-post-title" className="text-lg font-semibold text-(--text-primary)">
              {t('New Post')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
              aria-label={t('Close')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* Error */}
            {error && (
              <div className="mb-3 p-3 bg-(--error)/10 border border-(--error)/20 rounded-lg text-sm text-(--error)" role="alert">
                {error}
              </div>
            )}

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaInput}
              placeholder={t('Share a decision or discuss a rule...')}
              aria-label={t('Share a decision or discuss a rule...')}
              rows={3}
              className="w-full bg-(--bg-surface-2) text-(--text-primary) text-sm placeholder-(--text-muted) rounded-(--radius-input) border border-(--border-subtle) px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-(--brand-yellow)"
            />

            {/* Media preview */}
            {mediaPreview && (
              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-(--bg-primary)/80 flex items-center justify-center text-(--text-primary) hover:bg-(--bg-primary) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
                  aria-label={t('Remove media')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {mediaType === 'image' && (
                  <img
                    src={mediaPreview}
                    alt={t('Upload preview')}
                    className="w-full max-h-64 object-contain rounded-lg"
                  />
                )}
                {mediaType === 'video' && (
                  <video
                    src={mediaPreview}
                    controls
                    aria-label={t('Upload preview video')}
                    className="w-full max-h-48 rounded-lg bg-black"
                  />
                )}
                {mediaType === 'audio' && (
                  <div className="p-3 bg-(--bg-surface-2) rounded-lg border border-(--border-subtle) flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-(--text-muted) flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                    <span className="text-sm text-(--text-secondary) truncate">
                      {mediaPreview}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: media button + publish */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-(--border-subtle)">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-(--text-secondary) hover:text-(--brand-yellow) hover:bg-(--bg-hover) rounded-(--radius-button) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
              aria-label={t('Attach media')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span>{t('Media')}</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-5 py-2 text-sm font-semibold bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface) disabled:opacity-40"
            >
              {isSubmitting ? t('Publishing...') : t('Publish')}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/webm"
            onChange={handleFileSelect}
            className="hidden"
            aria-label={t('Upload file')}
          />
        </div>
      </div>
    </>
  )
}

export default CreatePostModal
