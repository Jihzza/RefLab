import { getMessageMediaPublicUrl } from '../api/messagesApi'
import type { Message } from '../types'

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

function resolveMediaUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  if (pathOrUrl.startsWith('blob:')) return pathOrUrl
  return getMessageMediaPublicUrl(pathOrUrl)
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const hasText = !!message.content?.trim()
  const hasMedia = !!message.media_url
  const mediaSrc = message.media_url ? resolveMediaUrl(message.media_url) : null

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
        {hasMedia && mediaSrc && (
          <div className="mb-2">
            {message.media_type === 'image' && (
              <img
                src={mediaSrc}
                alt="Message media"
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
