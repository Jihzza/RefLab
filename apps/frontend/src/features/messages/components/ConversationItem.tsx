import { ChevronRight, Image, Mic, UserRound, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { isDeletedConversationPeer } from '../conversationPeer'
import type { Conversation } from '../types'

interface ConversationItemProps {
  conversation: Conversation
  onClick: () => void
}

function formatRelativeTime(dateString: string, nowLabel: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
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

export default function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const otherUser = conversation.other_user
  const isDeletedPeer = isDeletedConversationPeer(otherUser)
  const displayName = isDeletedPeer
    ? t('Deleted account')
    : otherUser.name || otherUser.username
  const initials = displayName.slice(0, 2).toUpperCase()
  const lastMessage = conversation.last_message
  const isOwnLastMessage = lastMessage?.sender_id === user?.id
  const messageText = lastMessage?.content?.trim()
  const mediaLabel = lastMessage?.media_type === 'image'
    ? t('Image attachment')
    : lastMessage?.media_type === 'video'
      ? t('Video attachment')
      : lastMessage?.media_type === 'audio'
        ? t('Audio attachment')
        : null
  const preview = messageText || mediaLabel || t('No messages yet.')
  const timestamp = formatRelativeTime(lastMessage?.created_at ?? conversation.updated_at, t('now'))

  return (
    <Surface padding="none" selected={conversation.unread_count > 0} role="listitem">
      <button
        type="button"
        onClick={onClick}
        className="mc-focus-ring flex min-h-[4.75rem] w-full items-center gap-3 rounded-(--mc-radius-card) px-3 py-3 text-left transition-colors hover:bg-(--mc-color-surface-hover) sm:px-4"
        aria-label={t('Open conversation with {{name}}', { name: displayName })}
      >
        {!isDeletedPeer && otherUser.photo_url ? (
          <img src={otherUser.photo_url} alt="" className="size-12 shrink-0 rounded-full border border-(--mc-color-border-strong) object-cover" />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-(--mc-color-accent)/35 bg-(--mc-color-accent)/15 text-sm font-bold text-(--mc-color-accent)">
            {isDeletedPeer ? <UserRound className="size-5" aria-hidden="true" /> : initials}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className={`truncate text-sm text-(--mc-color-text) ${conversation.unread_count > 0 ? 'font-bold' : 'font-semibold'}`}>
              {displayName}
            </span>
            <span className="mc-tabular shrink-0 text-[10px] text-(--mc-color-text-muted)">{timestamp}</span>
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-(--mc-color-text-muted)">
            {lastMessage?.media_type === 'image' && !messageText && <Image className="size-3.5 shrink-0" aria-hidden="true" />}
            {lastMessage?.media_type === 'video' && !messageText && <Video className="size-3.5 shrink-0" aria-hidden="true" />}
            {lastMessage?.media_type === 'audio' && !messageText && <Mic className="size-3.5 shrink-0" aria-hidden="true" />}
            <span className="truncate">{isOwnLastMessage ? `${t('You')}: ${preview}` : preview}</span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1">
          {conversation.unread_count > 0 && (
            <Badge variant="accent" size="sm">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </Badge>
          )}
          <ChevronRight className="size-4 text-(--mc-color-text-muted)" aria-hidden="true" />
        </span>
      </button>
    </Surface>
  )
}
