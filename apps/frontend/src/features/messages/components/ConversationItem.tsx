import type { Conversation } from '../types'
import { useAuth } from '@/features/auth/components/useAuth'
import { useTranslation } from 'react-i18next'
import { ImageIcon, Video, Mic } from 'lucide-react'
import type { ReactNode } from 'react'

interface ConversationItemProps {
  conversation: Conversation
  onClick: () => void
}

function formatRelativeTime(dateString: string, nowLabel: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return nowLabel
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

function getLastMessagePreview(
  conversation: Conversation,
  currentUserId?: string,
  t?: (key: string) => string
): string {
  const translate = t ?? ((key: string) => key)
  const last = conversation.last_message
  if (!last) return translate('No messages yet.')

  const text = last.content?.trim()
  let preview = text ?? ''

  if (!preview) {
    if (last.media_type === 'image') preview = '[Imagem]'
    else if (last.media_type === 'video') preview = '[Vídeo]'
    else if (last.media_type === 'audio') preview = '[Áudio]'
    else preview = translate('No messages yet.')
  }

  if (currentUserId && last.sender_id === currentUserId) {
    return `Tu: ${preview}`
  }

  return preview
}

function mediaGlyph(conversation: Conversation): ReactNode {
  const last = conversation.last_message
  if (!last || last.content?.trim()) return null
  const cls = 'h-3.5 w-3.5 flex-shrink-0'
  if (last.media_type === 'image') return <ImageIcon className={cls} aria-hidden="true" />
  if (last.media_type === 'video') return <Video className={cls} aria-hidden="true" />
  if (last.media_type === 'audio') return <Mic className={cls} aria-hidden="true" />
  return null
}

export default function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const { t } = useTranslation()
  const { user: authUser } = useAuth()
  const otherUser = conversation.other_user
  const displayName = otherUser.name || otherUser.username
  const initials = displayName.slice(0, 2).toUpperCase()

  const preview = getLastMessagePreview(conversation, authUser?.id, t)
  const glyph = mediaGlyph(conversation)
  const hasUnread = conversation.unread_count > 0
  const timestamp = formatRelativeTime(
    conversation.last_message?.created_at ?? conversation.updated_at,
    t('now'),
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className="group card-console w-full p-3.5 flex items-center gap-3.5 text-left transition-[background-color,border-color,transform] duration-200 hover:bg-(--bg-hover) hover:border-(--border-strong) hover:-translate-y-0.5"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {otherUser.photo_url ? (
          <img
            src={otherUser.photo_url}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover ring-1 ring-(--border-subtle)"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center ring-1 ring-(--border-strong)"
            style={{ backgroundImage: 'var(--grad-brand)' }}
          >
            <span className="text-sm font-bold text-(--bg-primary)">{initials}</span>
          </div>
        )}
      </div>

      {/* Middle */}
      <div className="flex-1 min-w-0">
        <div
          className={[
            'text-sm truncate',
            hasUnread ? 'font-bold text-(--text-primary)' : 'font-semibold text-(--text-primary)',
          ].join(' ')}
        >
          {displayName}
        </div>
        <div
          className={[
            'mt-0.5 flex items-center gap-1.5 text-xs truncate',
            hasUnread ? 'text-(--text-secondary)' : 'text-(--text-muted)',
          ].join(' ')}
        >
          {glyph}
          <span className="truncate">{preview}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="numeral text-[11px] text-(--text-faint)">{timestamp}</span>
        {hasUnread ? (
          <span className="numeral min-w-5 h-5 px-1.5 rounded-full bg-(--brand-yellow) text-(--bg-primary) text-[10px] font-bold flex items-center justify-center shadow-[0_2px_10px_-2px_rgba(246,194,28,0.6)]">
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </span>
        ) : (
          <span className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
    </button>
  )
}
