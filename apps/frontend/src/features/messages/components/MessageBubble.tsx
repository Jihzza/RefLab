import { useEffect, useState } from 'react'
import { getMessageMediaSignedUrl } from '../api/messagesApi'
import type { Message } from '../types'
import { useTranslation } from 'react-i18next'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}

function isReadyUrl(value: string): boolean {
  return (
    value.startsWith('blob:') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  )
}

/**
 * Resolve a stored media reference to a displayable URL. Optimistic sends use a
 * local blob: URL and legacy rows may hold a full http(s) URL — both pass
 * through unchanged. Bare storage paths are exchanged for a short-lived signed
 * URL against the private message-media bucket.
 */
function useMessageMediaUrl(pathOrUrl: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    pathOrUrl && isReadyUrl(pathOrUrl) ? pathOrUrl : null
  )

  useEffect(() => {
    if (!pathOrUrl) {
      setUrl(null)
      return
    }
    if (isReadyUrl(pathOrUrl)) {
      setUrl(pathOrUrl)
      return
    }
    let cancelled = false
    setUrl(null)
    void getMessageMediaSignedUrl(pathOrUrl).then((signed) => {
      if (!cancelled) setUrl(signed)
    })
    return () => {
      cancelled = true
    }
  }, [pathOrUrl])

  return url
}

function formatTimestamp(dateString: string): string {
  const d = new Date(dateString)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const YYYY = String(d.getFullYear())
  return `${hh}:${mm}:${ss} ${DD}-${MM}-${YYYY}`
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const { t } = useTranslation()
  const hasText = !!message.content?.trim()
  const hasMedia = !!message.media_url
  const mediaSrc = useMessageMediaUrl(message.media_url ?? null)
  // While a signed URL is being fetched, hold space so the bubble doesn't jump.
  const mediaPending = hasMedia && !mediaSrc

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={[
          'max-w-[78%] px-4 py-2.5 text-sm shadow-[var(--shadow-soft)]',
          isOwn
            ? 'text-(--bg-primary) rounded-2xl rounded-br-sm'
            : 'bg-(--bg-surface) text-(--text-primary) border border-(--border-subtle) rounded-2xl rounded-bl-sm',
        ].join(' ')}
        style={isOwn ? { backgroundImage: 'var(--grad-brand)' } : undefined}
      >
        {mediaPending && (
          <div
            className="mb-2 w-48 max-w-full h-40 rounded-lg skeleton"
            aria-hidden="true"
          />
        )}

        {hasMedia && mediaSrc && (
          <div className="mb-2">
            {message.media_type === 'image' && (
              <img
                src={mediaSrc}
                alt={t('Message media')}
                className="w-full max-h-72 object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}

            {message.media_type === 'video' && (
              <video
                src={mediaSrc}
                controls
                aria-label={t('Message video')}
                className="w-full max-h-72 rounded-lg bg-(--bg-base)"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}

            {message.media_type === 'audio' && (
              <audio
                src={mediaSrc}
                controls
                aria-label={t('Voice message')}
                className="w-full"
              />
            )}
          </div>
        )}

        {hasText && (
          <div className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</div>
        )}

        <div
          className={[
            'numeral mt-1 text-[11px] tabular-nums',
            isOwn ? 'text-(--bg-primary)/75 text-right' : 'text-(--text-muted)',
          ].join(' ')}
        >
          {formatTimestamp(message.created_at)}
        </div>
      </div>
    </div>
  )
}
