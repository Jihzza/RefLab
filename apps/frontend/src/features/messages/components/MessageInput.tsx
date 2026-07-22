import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { Paperclip, Send, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, IconButton, TextArea } from '@/components/ui'
import {
  MESSAGE_MAX_CHARACTERS,
  MESSAGE_MEDIA_ACCEPT,
  validateMessageMediaFile,
} from '../validation'

interface MessageInputProps {
  onSend: (content: string, mediaFile?: File) => void | Promise<void>
  isSending: boolean
}

export default function MessageInput({ onSend, isSending }: MessageInputProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isLocallySending, setIsLocallySending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const busy = isSending || isLocallySending
  const canSend = Boolean((content.trim() || mediaFile) && !busy)

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const validationError = validateMessageMediaFile(file)
      if (validationError === 'type') {
        setLocalError(t('This file type is not supported. Choose an image, video or audio file.'))
        event.target.value = ''
        return
      }
      if (validationError === 'size') {
        setLocalError(t('The attachment must be 50 MB or smaller.'))
        event.target.value = ''
        return
      }

      setLocalError(null)
      setMediaFile(file)
    },
    [t],
  )

  const removeMedia = useCallback(() => {
    setMediaFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleSend = useCallback(async () => {
    if (!canSend) return
    setIsLocallySending(true)
    setLocalError(null)

    try {
      await onSend(content, mediaFile ?? undefined)
      setContent('')
      removeMedia()
      if (textAreaRef.current) textAreaRef.current.style.height = 'auto'
    } catch (caughtError) {
      setLocalError(
        caughtError instanceof Error ? caughtError.message : t('Failed to send. Please try again.'),
      )
      textAreaRef.current?.focus()
    } finally {
      setIsLocallySending(false)
    }
  }, [canSend, content, mediaFile, onSend, removeMedia, t])

  const charactersRemaining = MESSAGE_MAX_CHARACTERS - content.length

  return (
    <div className="mx-auto w-full max-w-[var(--mc-content-standard)] space-y-2">
      {localError && (
        <div className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/10 px-3 py-2 text-xs text-(--mc-color-danger)" role="alert">
          {localError}
        </div>
      )}

      {mediaFile && (
        <div className="flex items-center gap-2 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas) px-3 py-2">
          <Paperclip className="size-4 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-(--mc-color-text-secondary)">{mediaFile.name}</span>
          <span className="shrink-0 text-[10px] tabular-nums text-(--mc-color-text-muted)">{(mediaFile.size / 1024 / 1024).toFixed(1)} MB</span>
          <IconButton label={t('Remove attachment')} size="sm" variant="ghost" onClick={removeMedia} disabled={busy}>
            <X className="size-4" />
          </IconButton>
        </div>
      )}

      <div className="flex items-end gap-2">
        <IconButton
          label={t('Attach media')}
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="mb-0"
        >
          <Paperclip className="size-5" />
        </IconButton>

        <div className="min-w-0 flex-1">
          <TextArea
            ref={textAreaRef}
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
              setLocalError(null)
              event.target.style.height = 'auto'
              event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
            maxLength={MESSAGE_MAX_CHARACTERS}
            placeholder={t('Write a message...')}
            rows={1}
            resize="none"
            disabled={busy}
            className="min-h-11 max-h-32 py-2.5"
            aria-describedby="message-input-help"
          />
        </div>

        <Button
          onClick={() => void handleSend()}
          disabled={!canSend}
          loading={busy}
          aria-label={t('Send')}
          className="min-w-11 px-3 sm:min-w-24 sm:px-4"
        >
          <Send className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('Send')}</span>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept={MESSAGE_MEDIA_ACCEPT}
          onChange={handleFileSelect}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      <div id="message-input-help" className="flex items-center justify-between gap-3 text-[10px] text-(--mc-color-text-muted)">
        <span>{t('Attachments up to 50 MB')}</span>
        <span className="mc-tabular">{t('{{count}} characters remaining', { count: charactersRemaining })}</span>
      </div>
    </div>
  )
}
