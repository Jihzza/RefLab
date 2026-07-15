import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getMessageMediaPublicUrl } from '../api/messagesApi'
import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}

function formatTimestamp(dateString: string, locale: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()

  return new Intl.DateTimeFormat(locale, sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
  ).format(date)
}

function resolveMediaUrl(pathOrUrl: string): string {
  if (
    pathOrUrl.startsWith('http://')
    || pathOrUrl.startsWith('https://')
    || pathOrUrl.startsWith('blob:')
  ) {
    return pathOrUrl
  }
  return getMessageMediaPublicUrl(pathOrUrl)
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const { t, i18n } = useTranslation()
  const [failedMediaSource, setFailedMediaSource] = useState<string | null>(null)
  const hasText = Boolean(message.content?.trim())
  const mediaSource = message.media_url
    ? resolveMediaUrl(message.media_url)
    : null
  const mediaFailed = Boolean(mediaSource && failedMediaSource === mediaSource)
  const isOptimistic = message.id.startsWith('temp-')

  return (
    <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={[
        'relative max-w-[86%] sm:max-w-[75%] lg:max-w-[68%]',
        isOwn ? 'pr-3' : '',
      ].join(' ')}>
        <article
          className={[
            'relative px-4 py-3 shadow-(--mc-shadow-soft)',
            isOwn
              ? 'rounded-[1rem] rounded-br-sm bg-(--mc-color-accent) text-(--mc-color-canvas) [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_1.15rem),calc(100%_-_0.7rem)_100%,0_100%)]'
              : 'rounded-[1rem] rounded-bl-sm border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text)',
          ].join(' ')}
        >
          {mediaSource && !mediaFailed && (
            <div className={`${hasText ? 'mb-2.5' : 'mb-1'} overflow-hidden rounded-xl bg-(--mc-color-canvas)`}>
              {message.media_type === 'image' && (
                <img
                  src={mediaSource}
                  alt={t('Message media')}
                  className="max-h-80 w-full object-contain"
                  loading="lazy"
                  onError={() => setFailedMediaSource(mediaSource)}
                />
              )}

              {message.media_type === 'video' && (
                <video
                  src={mediaSource}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-80 w-full bg-black"
                  onError={() => setFailedMediaSource(mediaSource)}
                />
              )}

              {message.media_type === 'audio' && (
                <audio
                  src={mediaSource}
                  controls
                  preload="metadata"
                  className="w-full min-w-52 py-2"
                  onError={() => setFailedMediaSource(mediaSource)}
                />
              )}
            </div>
          )}

          {mediaSource && mediaFailed && (
            <div
              role="status"
              className={[
                'mb-2 flex min-h-20 items-center justify-center gap-2 rounded-xl border px-3 py-4 text-xs font-medium',
                isOwn
                  ? 'border-(--mc-color-canvas)/20 bg-(--mc-color-canvas)/10 text-(--mc-color-canvas)'
                  : 'border-(--mc-color-border) bg-(--mc-color-canvas) text-(--mc-color-text-secondary)',
              ].join(' ')}
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span>{t('Data unavailable')}</span>
            </div>
          )}

          {hasText && (
            <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.45]">
              {message.content}
            </p>
          )}

          <time
            dateTime={message.created_at}
            className={[
              'mc-tabular mt-1.5 block text-[11px] leading-none',
              isOwn
                ? 'text-(--mc-color-canvas)/70'
                : 'text-(--mc-color-text-muted)',
            ].join(' ')}
          >
            {isOptimistic
              ? t('Sending...')
              : formatTimestamp(message.created_at, i18n.language)}
          </time>
        </article>

        {isOwn && (
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 h-7 w-2.5 -skew-x-[24deg] rounded-sm bg-(--mc-color-danger)"
          />
        )}
      </div>
    </div>
  )
}
