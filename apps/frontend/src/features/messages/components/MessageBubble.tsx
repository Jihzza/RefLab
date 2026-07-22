import { useEffect, useState } from 'react'
import { getMessageMediaSignedUrl } from '../api/messagesApi'
import type { Message } from '../types'
import { useTranslation } from 'react-i18next'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
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
  const mediaSource = message.media_url
  const directMediaSrc = mediaSource?.startsWith('blob:') ? mediaSource : null
  const [resolvedMedia, setResolvedMedia] = useState<{
    source: string
    url: string | null
    failed: boolean
  } | null>(null)

  useEffect(() => {
    if (!mediaSource || directMediaSrc) return

    let active = true

    void getMessageMediaSignedUrl(mediaSource).then(({ data, error }) => {
      if (!active) return
      setResolvedMedia({ source: mediaSource, url: data, failed: !!error })
    })

    return () => {
      active = false
    }
  }, [directMediaSrc, mediaSource])

  const mediaSrc = directMediaSrc
    ?? (resolvedMedia?.source === mediaSource ? resolvedMedia.url : null)
  const mediaFailed = resolvedMedia?.source === mediaSource && resolvedMedia.failed

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[75%] px-4 py-3 text-sm',
          isOwn
            ? 'bg-(--brand-yellow) text-(--bg-primary) rounded-2xl rounded-br-md'
            : 'bg-(--bg-surface-2) text-(--text-primary) rounded-2xl rounded-bl-md',
        ].join(' ')}
      >
        {hasMedia && !mediaSrc && !mediaFailed && (
          <div
            className="mb-2 h-24 animate-pulse rounded-lg bg-black/15"
            role="status"
            aria-label={t('Loading media')}
          />
        )}

        {hasMedia && mediaFailed && (
          <p className="mb-2 text-xs opacity-70" role="status">
            {t('Media unavailable')}
          </p>
        )}

        {hasMedia && mediaSrc && (
          <div className="mb-2">
            {message.media_type === 'image' && (
              <img
                src={mediaSrc}
                alt={t('Message media')}
                className="w-full max-h-72 object-contain rounded-lg"
              />
            )}

            {message.media_type === 'video' && (
              <video
                src={mediaSrc}
                controls
                className="w-full max-h-72 rounded-lg bg-black"
              />
            )}

            {message.media_type === 'audio' && (
              <audio src={mediaSrc} controls className="w-full" />
            )}
          </div>
        )}

        {hasText && <div className="whitespace-pre-wrap break-words">{message.content}</div>}

        <div
          className={[
            'mt-1 text-[10px]',
            isOwn ? 'text-(--bg-primary)/70' : 'text-(--text-muted)',
          ].join(' ')}
        >
          {formatTimestamp(message.created_at)}
        </div>
      </div>
    </div>
  )
}
