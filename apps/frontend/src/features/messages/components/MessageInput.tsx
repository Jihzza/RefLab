import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Paperclip, X, Send } from 'lucide-react'
import Button from '@/components/ui/Button'

interface MessageInputProps {
  onSend: (content: string, mediaFile?: File) => void | Promise<void>
  isSending: boolean
}

const ACCEPT_MIME =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/webm'

// Mirror the message-media bucket limits (backend/supabase/migrations/20260212_0006_messages_tables.sql)
const ALLOWED_MIME = ACCEPT_MIME.split(',')
const MAX_MEDIA_BYTES = 50 * 1024 * 1024 // 50 MB

export default function MessageInput({ onSend, isSending }: MessageInputProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendingRef = useRef(false)

  const canSend = (!!content.trim() || !!mediaFile) && !isSending

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate before upload so oversized/invalid files fail fast with a clear message.
    if (!ALLOWED_MIME.includes(file.type)) {
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
    setMediaFile(file)
  }, [t])

  const removeMedia = useCallback(() => {
    setMediaFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleSend = useCallback(async () => {
    if (!canSend || sendingRef.current) return
    sendingRef.current = true
    const text = content
    const file = mediaFile ?? undefined

    setContent('')
    removeMedia()

    try {
      await onSend(text, file)
    } finally {
      sendingRef.current = false
    }
  }, [canSend, content, mediaFile, onSend, removeMedia])

  return (
    <div className="glass border-t border-(--border-subtle) px-3 py-2.5 pb-safe">
      {error && (
        <div
          role="alert"
          className="mb-2 px-3 py-2 text-xs text-(--error) bg-(--error)/10 border border-(--error)/20 rounded-(--radius-input)"
        >
          {error}
        </div>
      )}

      {mediaFile && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-center gap-2 max-w-full px-3 py-2 card-console">
            <Paperclip
              className="h-4 w-4 text-(--brand-yellow) flex-shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs text-(--text-secondary) truncate">
              {mediaFile.name}
            </span>
          </div>

          <button
            onClick={removeMedia}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors flex-shrink-0"
            aria-label={t('Remove attachment')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-11 h-11 flex-shrink-0 rounded-(--radius-button) flex items-center justify-center text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--brand-yellow) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t('Attach media')}
          disabled={isSending}
        >
          <Paperclip className="h-5 w-5" aria-hidden="true" />
        </button>

        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder={t('Write message..:')}
          aria-label={t('Write message..:')}
          className="flex-1 h-11 px-4 bg-(--bg-surface-2) border border-(--border-subtle) rounded-(--radius-pill) text-sm text-(--text-primary) placeholder-(--text-faint) outline-none transition-[border-color,box-shadow] duration-150 focus:border-(--brand-yellow) focus:shadow-[0_0_0_3px_rgba(246,194,28,0.16)] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSending}
        />

        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          loading={isSending}
          leftIcon={!isSending ? <Send className="h-4 w-4" aria-hidden="true" /> : undefined}
          className="flex-shrink-0"
        >
          {isSending ? t('Sending...') : t('Send')}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_MIME}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}
