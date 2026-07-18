import { useState } from 'react'
import { AlertTriangle, Clock3, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMessageMediaUrl } from '../hooks/useMessageMediaUrl'
import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onRetry?: (clientId: string) => void
  onDiscard?: (clientId: string) => void
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

export default function MessageBubble({
  message,
  isOwn,
  onRetry,
  onDiscard,
}: MessageBubbleProps) {
  const { t, i18n } = useTranslation()
  const [failedMediaSource, setFailedMediaSource] = useState<string | null>(null)
  const hasText = Boolean(message.content?.trim())
  const media = useMessageMediaUrl(message.media_url)
  const mediaSource = media.url
  const mediaFailed = Boolean(
    media.error
    || (mediaSource && failedMediaSource === mediaSource),
  )
  const isPending = message.delivery_state === 'pending'
  const isFailed = message.delivery_state === 'failed'
  const outboxClientId = message.outbox_client_id

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
          {message.media_url && media.isLoading && (
            <div className="mb-2.5 flex min-h-20 items-center justify-center rounded-xl bg-(--mc-color-canvas)">
              <LoaderCircle
                className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none"
                aria-hidden="true"
              />
            </div>
          )}

          {mediaSource && !mediaFailed && !media.isLoading && (
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

          {message.media_url && mediaFailed && !media.isLoading && (
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
            {isPending ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" aria-hidden="true" />
                {t('Sending...')}
              </span>
            ) : isFailed ? (
              t('Failed to send message.')
            ) : (
              formatTimestamp(message.created_at, i18n.language)
            )}
          </time>

          {isFailed && outboxClientId && (
            <div className="mt-2 border-t border-current/20 pt-2">
              {message.delivery_error && (
                <p className="mb-2 text-[11px] leading-4 opacity-80">
                  {message.delivery_error}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(outboxClientId)}
                    className="mc-focus-ring inline-flex min-h-8 items-center gap-1 rounded-lg border border-current/25 px-2 text-[11px] font-bold"
                  >
                    <RotateCcw className="size-3" aria-hidden="true" />
                    {t('Retry')}
                  </button>
                )}
                {onDiscard && (
                  <button
                    type="button"
                    onClick={() => onDiscard(outboxClientId)}
                    className="mc-focus-ring inline-flex min-h-8 items-center gap-1 rounded-lg border border-current/25 px-2 text-[11px] font-bold"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                    {t('Delete')}
                  </button>
                )}
              </div>
            </div>
          )}
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
