import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { AlertTriangle, FileAudio, Paperclip, Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar, Button, Dialog, IconButton, Surface, TextArea } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { createPost } from '../api/socialApi'
import type { Post, PostMediaType } from '../types'
import {
  ACCEPTED_POST_MEDIA_TYPES,
  POST_CONTENT_MAX_LENGTH,
  POST_MEDIA_MAX_BYTES,
  POST_MEDIA_MAX_MEBIBYTES,
} from '../config'

interface CreatePostModalProps {
  onClose: () => void
  onPostCreated: (post: Post) => void
}

const ACCEPTED_MEDIA_ATTRIBUTE = ACCEPTED_POST_MEDIA_TYPES.join(',')

function getMediaType(mime: string): Exclude<PostMediaType, 'text'> | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return null
}

/** Accessible post composer with optional image, video, or audio upload. */
export default function CreatePostModal({
  onClose,
  onPostCreated,
}: CreatePostModalProps) {
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
  const previewObjectUrlRef = useRef<string | null>(null)

  const displayName =
    profile?.name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    t('Profile')
  const profileAvatarUrl = profile?.photo_url ?? null
  const providerAvatarUrl = typeof user?.user_metadata?.avatar_url === 'string'
    ? user.user_metadata.avatar_url
    : null

  const clearPreviewObjectUrl = useCallback(() => {
    if (!previewObjectUrlRef.current) return
    URL.revokeObjectURL(previewObjectUrlRef.current)
    previewObjectUrlRef.current = null
  }, [])

  useEffect(() => clearPreviewObjectUrl, [clearPreviewObjectUrl])

  const handleFileSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const nextMediaType = getMediaType(file.type)
    if (!nextMediaType) {
      clearPreviewObjectUrl()
      setMediaFile(null)
      setMediaPreview(null)
      setMediaType('text')
      setError(t('Unsupported media type. Please choose an image, video, or audio file.'))
      event.target.value = ''
      return
    }

    if (file.size <= 0 || file.size > POST_MEDIA_MAX_BYTES) {
      clearPreviewObjectUrl()
      setMediaFile(null)
      setMediaPreview(null)
      setMediaType('text')
      setError(t('Media files must be no larger than {{count}} MB.', {
        count: POST_MEDIA_MAX_MEBIBYTES,
      }))
      event.target.value = ''
      return
    }

    clearPreviewObjectUrl()
    setError(null)
    setMediaFile(file)
    setMediaType(nextMediaType)

    if (nextMediaType === 'image' || nextMediaType === 'video') {
      const objectUrl = URL.createObjectURL(file)
      previewObjectUrlRef.current = objectUrl
      setMediaPreview(objectUrl)
    } else {
      setMediaPreview(file.name)
    }
  }, [clearPreviewObjectUrl, t])

  const removeMedia = useCallback(() => {
    clearPreviewObjectUrl()
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType('text')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [clearPreviewObjectUrl])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

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
        mediaFile || undefined,
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
    } catch (submitError) {
      const message = submitError instanceof Error
        ? submitError.message
        : t('Something went wrong. Please try again.')
      setError(message)
      setIsSubmitting(false)
    }
  }

  const handleTextareaInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value)
    event.target.style.height = 'auto'
    event.target.style.height = `${Math.min(event.target.scrollHeight, 208)}px`
  }

  const canSubmit = Boolean((content.trim() || mediaFile) && !isSubmitting)

  return (
    <Dialog
      id="create-post-dialog"
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
      title={t('New Post')}
      size="md"
      initialFocusRef={textareaRef}
      closeLabel={t('Close')}
      showCloseButton={!isSubmitting}
      closeOnEscape={!isSubmitting}
      closeOnOverlayClick={!isSubmitting}
      overlayClassName="max-sm:items-end max-sm:justify-stretch max-sm:p-0"
      className="border-(--mc-color-border-strong) max-sm:max-h-[88dvh] max-sm:max-w-none max-sm:rounded-t-(--mc-radius-card) max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0"
      bodyClassName="p-0"
      footer={(
        <div className="flex w-full flex-wrap items-center justify-end gap-3 pb-[var(--mc-safe-bottom)] sm:pb-0">
          <Button
            variant="ghost"
            size="md"
            leadingIcon={<Paperclip className="size-4" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="mr-auto"
          >
            {t('Media')}
          </Button>
          <Button
            type="submit"
            form="create-post-form"
            size="md"
            leadingIcon={<Send className="size-4" />}
            disabled={!canSubmit}
            loading={isSubmitting}
            loadingText={t('Publishing...')}
            className="min-w-28"
          >
            {t('Publish')}
          </Button>
        </div>
      )}
    >
      <form id="create-post-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="space-y-4 p-4 sm:p-5">
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/8 px-3.5 py-3 text-sm text-(--mc-color-danger)"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{error}</span>
            </div>
          )}

          <div className="flex min-w-0 items-start gap-3">
            <Avatar
              src={profileAvatarUrl}
              ownerId={profile?.id ?? user?.id}
              providerSrc={providerAvatarUrl}
              allowAuthProviderImage
              alt={displayName}
              name={displayName}
              size="lg"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 min-w-0">
                <p className="truncate text-sm font-semibold text-(--mc-color-text)">{displayName}</p>
                {profile?.username && (
                  <p className="truncate text-xs text-(--mc-color-text-muted)">@{profile.username}</p>
                )}
              </div>
              <TextArea
                ref={textareaRef}
                value={content}
                onChange={handleTextareaInput}
                placeholder={t("What's on your mind?")}
                aria-label={t("What's on your mind?")}
                rows={4}
                maxLength={POST_CONTENT_MAX_LENGTH}
                resize="none"
                disabled={isSubmitting}
                hint={(
                  <span aria-live="polite" aria-atomic="true">
                    {content.length} / {POST_CONTENT_MAX_LENGTH}
                  </span>
                )}
                className="min-h-32 max-h-52 bg-(--mc-color-canvas) px-4 py-3 text-base"
              />
            </div>
          </div>

          {mediaPreview && (
            <Surface
              padding="none"
              variant="inset"
              className="relative overflow-hidden border-(--mc-color-border-strong) shadow-none"
            >
              <IconButton
                label={t('Remove media')}
                size="sm"
                variant="secondary"
                onClick={removeMedia}
                disabled={isSubmitting}
                className="absolute top-2 right-2 z-10 border-white/15 bg-black/75 text-white hover:bg-black"
              >
                <X className="size-4" />
              </IconButton>

              {mediaType === 'image' && (
                <img
                  src={mediaPreview}
                  alt={t('Upload preview')}
                  className="max-h-80 w-full bg-black/25 object-contain"
                />
              )}
              {mediaType === 'video' && (
                <video
                  src={mediaPreview}
                  controls
                  preload="metadata"
                  aria-label={t('Upload preview')}
                  className="max-h-72 w-full bg-black"
                />
              )}
              {mediaType === 'audio' && (
                <div className="flex min-h-24 items-center gap-3 px-4 py-4 pr-14">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-accent)/35 bg-(--mc-color-accent)/10 text-(--mc-color-accent)">
                    <FileAudio className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium text-(--mc-color-text-secondary)">
                    {mediaFile?.name ?? mediaPreview}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-(--mc-color-border) px-3 py-2 text-xs text-(--mc-color-text-muted)">
                <Paperclip className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
                <span className="min-w-0 truncate">{mediaFile?.name}</span>
              </div>
            </Surface>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MEDIA_ATTRIBUTE}
          onChange={handleFileSelect}
          disabled={isSubmitting}
          className="sr-only"
          tabIndex={-1}
        />
      </form>
    </Dialog>
  )
}
