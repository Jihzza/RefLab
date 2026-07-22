import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { FileAudio, ImagePlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog, IconButton, Surface, TextArea } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { createPost } from '../api/socialApi'
import type { Post, PostMediaType } from '../types'
import {
  POST_MAX_CHARACTERS,
  SOCIAL_MEDIA_ACCEPT,
  validateSocialMediaFile,
} from '../validation'

interface CreatePostModalProps {
  onClose: () => void
  onPostCreated: (post: Post) => void
}

export default function CreatePostModal({ onClose, onPostCreated }: CreatePostModalProps) {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<PostMediaType>('text')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewUrlRef = useRef<string | null>(null)

  const replacePreviewUrl = useCallback((nextUrl: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = nextUrl
    setMediaPreviewUrl(nextUrl)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const removeMedia = useCallback(() => {
    setMediaFile(null)
    setMediaType('text')
    replacePreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [replacePreviewUrl])

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const validationError = validateSocialMediaFile(file)
      if (validationError === 'type') {
        setError(t('This file type is not supported. Choose an image, video or audio file.'))
        event.target.value = ''
        return
      }
      if (validationError === 'size') {
        setError(t('The attachment must be 50 MB or smaller.'))
        event.target.value = ''
        return
      }

      let nextMediaType: PostMediaType = 'text'
      if (file.type.startsWith('image/')) nextMediaType = 'image'
      else if (file.type.startsWith('video/')) nextMediaType = 'video'
      else if (file.type.startsWith('audio/')) nextMediaType = 'audio'

      setError(null)
      setMediaFile(file)
      setMediaType(nextMediaType)
      replacePreviewUrl(
        nextMediaType === 'image' || nextMediaType === 'video'
          ? URL.createObjectURL(file)
          : null,
      )
    },
    [replacePreviewUrl, t],
  )

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
        mediaFile || undefined,
      )

      if (postError) {
        setError(postError.message)
        return
      }

      if (post) {
        onPostCreated({
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
        })
      }

      onClose()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t('Something went wrong. Please try again.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const charactersRemaining = POST_MAX_CHARACTERS - content.length
  const canSubmit = Boolean((content.trim() || mediaFile) && !isSubmitting)

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
      title={t('New Post')}
      description={t('Share an update with the RefLab community.')}
      size="lg"
      initialFocusRef={textareaRef}
      closeOnEscape={!isSubmitting}
      closeOnOverlayClick={!isSubmitting}
      bodyClassName="space-y-4"
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="secondary"
            leadingIcon={<ImagePlus className="size-4" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
          >
            {mediaFile ? t('Replace media') : t('Attach media')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            loading={isSubmitting}
            loadingText={t('Publishing...')}
          >
            {t('Publish')}
          </Button>
        </div>
      }
    >
      {error && (
        <div
          className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm text-(--mc-color-danger)"
          role="alert"
        >
          {error}
        </div>
      )}

      <TextArea
        ref={textareaRef}
        value={content}
        maxLength={POST_MAX_CHARACTERS}
        onChange={(event) => setContent(event.target.value)}
        placeholder={t("What's on your mind?")}
        rows={5}
        resize="none"
        className="min-h-36"
        aria-describedby="post-character-count post-media-requirements"
      />

      <div className="flex items-center justify-between gap-3 text-xs text-(--mc-color-text-muted)">
        <span id="post-media-requirements">
          {t('Images, video or audio · maximum 50 MB')}
        </span>
        <span id="post-character-count" className="mc-tabular shrink-0">
          {t('{{count}} characters remaining', { count: charactersRemaining })}
        </span>
      </div>

      {mediaFile && (
        <Surface className="relative overflow-hidden" padding="sm" variant="inset">
          <IconButton
            label={t('Remove media')}
            size="sm"
            variant="secondary"
            onClick={removeMedia}
            className="absolute right-2 top-2 z-10 bg-(--mc-color-canvas)/90"
          >
            <X className="size-4" />
          </IconButton>

          {mediaType === 'image' && mediaPreviewUrl && (
            <img
              src={mediaPreviewUrl}
              alt={t('Upload preview')}
              className="max-h-72 w-full rounded-(--mc-radius-input) object-contain"
            />
          )}
          {mediaType === 'video' && mediaPreviewUrl && (
            <video
              src={mediaPreviewUrl}
              controls
              className="max-h-64 w-full rounded-(--mc-radius-input) bg-black"
            />
          )}
          {mediaType === 'audio' && (
            <div className="flex min-h-20 items-center gap-3 pr-12">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-button) bg-(--mc-color-accent)/10 text-(--mc-color-accent)">
                <FileAudio className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 truncate text-sm font-medium text-(--mc-color-text-secondary)">
                {mediaFile.name}
              </span>
            </div>
          )}
        </Surface>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={SOCIAL_MEDIA_ACCEPT}
        onChange={handleFileSelect}
        className="sr-only"
        tabIndex={-1}
      />
    </Dialog>
  )
}
