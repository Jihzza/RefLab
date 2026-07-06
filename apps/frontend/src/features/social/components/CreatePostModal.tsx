import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ImageIcon, Music2, X } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import Button from '@/components/ui/Button'
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

  const composerName = profile?.name || profile?.username || ''
  const composerInitials = composerName.slice(0, 2).toUpperCase() || '??'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-(--bg-base)/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-post-title"
          className="card-console w-full max-w-lg shadow-[var(--shadow-pop)] pointer-events-auto flex flex-col max-h-[85vh] animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-subtle)">
            <div className="min-w-0">
              <p className="eyebrow">{t('The Referee\'s Console')}</p>
              <h2 id="create-post-title" className="text-lg font-bold text-(--text-primary) leading-tight">
                {t('What decision would you give?')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
              aria-label={t('Close')}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* Error */}
            {error && (
              <div className="mb-3 p-3 bg-(--error)/10 border border-(--error)/25 rounded-(--radius-button) text-sm text-(--error)" role="alert">
                {error}
              </div>
            )}

            {/* Composer row: avatar + textarea */}
            <div className="flex gap-3">
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={composerName}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-1 ring-(--border-subtle)"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-white/10"
                  style={{ backgroundImage: 'var(--grad-brand)' }}
                >
                  <span className="text-sm font-bold text-(--bg-primary)">{composerInitials}</span>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleTextareaInput}
                placeholder={t('Share a decision or discuss a rule...')}
                aria-label={t('Share a decision or discuss a rule...')}
                rows={3}
                className="flex-1 min-w-0 bg-transparent text-(--text-primary) text-[15px] leading-relaxed placeholder-(--text-faint) border-0 resize-none focus:outline-none pt-1.5"
              />
            </div>

            {/* Media preview */}
            {mediaPreview && (
              <div className="relative mt-3 ml-[52px]">
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-(--bg-base)/80 backdrop-blur flex items-center justify-center text-(--text-primary) hover:bg-(--bg-base) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
                  aria-label={t('Remove media')}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>

                {mediaType === 'image' && (
                  <img
                    src={mediaPreview}
                    alt={t('Upload preview')}
                    className="w-full max-h-64 object-contain rounded-(--radius-card) border border-(--border-subtle)"
                  />
                )}
                {mediaType === 'video' && (
                  <video
                    src={mediaPreview}
                    controls
                    aria-label={t('Upload preview video')}
                    className="w-full max-h-48 rounded-(--radius-card) border border-(--border-subtle) bg-black"
                  />
                )}
                {mediaType === 'audio' && (
                  <div className="p-3 surface-2 flex items-center gap-2">
                    <Music2 className="h-5 w-5 text-(--text-muted) flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm text-(--text-secondary) truncate">
                      {mediaPreview}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: media button + publish */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-(--border-subtle)">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 h-9 px-3 text-sm font-medium text-(--text-secondary) hover:text-(--brand-yellow) hover:bg-(--brand-yellow)/10 rounded-(--radius-button) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
              aria-label={t('Attach media')}
            >
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
              <span>{t('Media')}</span>
            </button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={isSubmitting}
            >
              {isSubmitting ? t('Publishing...') : t('Publish')}
            </Button>
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
