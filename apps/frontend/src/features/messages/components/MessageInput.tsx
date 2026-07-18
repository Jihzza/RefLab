import { useCallback, useEffect, useRef, useState } from 'react'
import { FileAudio, FileVideo, Image as ImageIcon, Paperclip, SendHorizontal, X } from 'lucide-react'
import { IconButton } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import {
  MAX_MESSAGE_MEDIA_BYTES,
  MESSAGE_MEDIA_MIME_TYPES,
} from '../mediaConfig'

interface MessageInputProps {
  onSend: (content: string, mediaFile?: File) => Promise<boolean>
  isSending: boolean
  disabled?: boolean
  error?: string | null
  onDismissError?: () => void
}

const ACCEPT_MIME = MESSAGE_MEDIA_MIME_TYPES.join(',')
const ACCEPTED_TYPES = new Set(MESSAGE_MEDIA_MIME_TYPES)

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="size-5" />
  if (type.startsWith('video/')) return <FileVideo className="size-5" />
  return <FileAudio className="size-5" />
}

function ImageAttachmentPreview({ file }: { file: File }) {
  const [objectUrl] = useState(() => URL.createObjectURL(file))

  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl])

  return (
    <img
      src={objectUrl}
      alt={file.name}
      className="size-full object-cover"
    />
  )
}

export default function MessageInput({
  onSend,
  isSending,
  disabled = false,
  error = null,
  onDismissError,
}: MessageInputProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = (Boolean(content.trim()) || Boolean(mediaFile))
    && !isSending
    && !disabled
  const visibleError = attachmentError ?? error

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`
  }, [content])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_TYPES.has(file.type)) {
      setAttachmentError(t('Unsupported attachment type.'))
      event.target.value = ''
      return
    }

    if (file.size <= 0 || file.size > MAX_MESSAGE_MEDIA_BYTES) {
      setAttachmentError(t('Media files must be no larger than {{count}} MB.', {
        count: 20,
      }))
      event.target.value = ''
      return
    }

    setAttachmentError(null)
    onDismissError?.()
    setMediaFile(file)
  }, [onDismissError, t])

  const removeMedia = useCallback(() => {
    setMediaFile(null)
    setAttachmentError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const dismissVisibleError = useCallback(() => {
    setAttachmentError(null)
    onDismissError?.()
  }, [onDismissError])

  const handleSend = useCallback(async () => {
    if (!canSend) return

    const draft = content
    const attachment = mediaFile
    setContent('')
    setMediaFile(null)
    setAttachmentError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onDismissError?.()

    const sent = await onSend(draft, attachment ?? undefined)
    if (!sent) {
      setContent(draft)
      setMediaFile(attachment)
    }

    window.requestAnimationFrame(() => textareaRef.current?.focus())
  }, [canSend, content, mediaFile, onDismissError, onSend])

  return (
    <form
      className="border-t border-(--mc-color-border) bg-(--mc-color-surface) px-3 py-3 sm:px-4"
      onSubmit={event => {
        event.preventDefault()
        void handleSend()
      }}
    >
      {visibleError && (
        <div
          id="message-composer-error"
          role="alert"
          className="mb-2 flex items-start justify-between gap-3 rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2 text-xs leading-5 text-(--mc-color-text-secondary)"
        >
          <span className="min-w-0 break-words">{visibleError}</span>
          <button
            type="button"
            onClick={dismissVisibleError}
            className="mc-focus-ring -m-1 flex size-7 shrink-0 items-center justify-center rounded-lg text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
            aria-label={t('Close')}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {mediaFile && (
        <div className="mb-2 flex items-center gap-3 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-surface-raised) p-2">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-(--mc-color-border) bg-(--mc-color-canvas) text-(--mc-color-accent)">
            {mediaFile.type.startsWith('image/') ? (
              <ImageAttachmentPreview
                key={`${mediaFile.name}-${mediaFile.lastModified}`}
                file={mediaFile}
              />
            ) : (
              <AttachmentIcon type={mediaFile.type} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-(--mc-color-text)">
              {mediaFile.name}
            </p>
            <p className="mt-0.5 text-[11px] text-(--mc-color-text-muted)">
              {formatFileSize(mediaFile.size)}
            </p>
          </div>

          <IconButton
            label={t('Remove attachment')}
            variant="ghost"
            size="md"
            onClick={removeMedia}
            disabled={isSending || disabled}
          >
            <X className="size-5" />
          </IconButton>
        </div>
      )}

      <div className="flex items-end gap-2">
        <IconButton
          label={t('Attach media')}
          variant="secondary"
          size="md"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending || disabled}
        >
          <Paperclip className="size-5" />
        </IconButton>

        <textarea
          ref={textareaRef}
          value={content}
          rows={1}
          onChange={event => {
            setContent(event.target.value)
            if (error) onDismissError?.()
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
          placeholder={t('Write a message...')}
          aria-describedby={visibleError ? 'message-composer-error' : undefined}
          className="min-h-11 max-h-28 flex-1 resize-none overflow-y-auto rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-surface-raised) px-3 py-[11px] text-sm leading-5 text-(--mc-color-text) placeholder:text-(--mc-color-text-muted) hover:border-(--mc-color-border-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-1 focus-visible:ring-offset-(--mc-color-canvas) disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSending || disabled}
        />

        <IconButton
          label={t('Send')}
          type="submit"
          variant="primary"
          size="md"
          loading={isSending}
          disabled={!canSend}
          className="relative overflow-hidden"
        >
          <SendHorizontal className="size-5" />
        </IconButton>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_MIME}
          onChange={handleFileSelect}
          disabled={isSending || disabled}
          className="hidden"
          tabIndex={-1}
        />
      </div>
    </form>
  )
}
