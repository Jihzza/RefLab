import { Avatar } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { useTranslation } from 'react-i18next'
import type { Conversation } from '../types'

interface ConversationItemProps {
  conversation: Conversation
  onClick: () => void
  selected?: boolean
}

function formatConversationTime(
  dateString: string,
  nowLabel: string,
  locale: string,
): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const elapsedSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (elapsedSeconds < 60) return nowLabel

  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()

  if (sameDay) {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (elapsedSeconds < 7 * 24 * 60 * 60) {
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

function getLastMessagePreview(
  conversation: Conversation,
  currentUserId: string | undefined,
  translate: (key: string) => string,
): string {
  const lastMessage = conversation.last_message
  if (!lastMessage) return translate('No messages yet.')

  let preview = lastMessage.content?.trim() ?? ''
  if (!preview) {
    if (lastMessage.media_type === 'image') preview = translate('Image')
    else if (lastMessage.media_type === 'video') preview = translate('Video')
    else if (lastMessage.media_type === 'audio') preview = translate('Audio')
    else preview = translate('No messages yet.')
  }

  return currentUserId && lastMessage.sender_id === currentUserId
    ? `Tu: ${preview}`
    : preview
}

export default function ConversationItem({
  conversation,
  onClick,
  selected = false,
}: ConversationItemProps) {
  const { t, i18n } = useTranslation()
  const { user: authUser } = useAuth()
  const otherUser = conversation.other_user
  const displayName = otherUser.is_blocked
    ? t('Blocked account')
    : otherUser.is_deleted
      ? t('This user is unavailable.')
    : otherUser.name || otherUser.username
  const preview = getLastMessagePreview(conversation, authUser?.id, t)
  const timestamp = formatConversationTime(
    conversation.last_message?.created_at ?? conversation.updated_at,
    t('now'),
    i18n.language,
  )

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? 'page' : undefined}
      className={[
        'mc-interactive mc-focus-ring relative flex min-h-20 w-full items-center gap-3 rounded-(--mc-radius-card) border px-3 py-3 text-left',
        selected
          ? 'border-(--mc-color-accent)/55 bg-(--mc-color-surface-raised) shadow-(--mc-shadow-soft)'
          : 'border-transparent bg-transparent hover:border-(--mc-color-border) hover:bg-(--mc-color-surface-raised)',
      ].join(' ')}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-(--mc-color-accent)"
        />
      )}

      <Avatar
        src={otherUser.photo_url}
        ownerId={otherUser.id}
        alt={displayName}
        name={displayName}
        size="lg"
        className="border-(--mc-color-border-strong)"
      />

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-(--mc-color-text)">
            {displayName}
          </span>
          <span className="mc-tabular shrink-0 text-[11px] text-(--mc-color-text-muted)">
            {timestamp}
          </span>
        </span>

        <span className="mt-1 flex items-center justify-between gap-3">
          <span className={[
            'truncate text-xs leading-5',
            conversation.unread_count > 0
              ? 'font-medium text-(--mc-color-text-secondary)'
              : 'text-(--mc-color-text-muted)',
          ].join(' ')}>
            {preview}
          </span>

          {conversation.unread_count > 0 && (
            <span className="mc-tabular flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-(--mc-color-accent) px-1.5 text-[10px] font-extrabold text-(--mc-color-canvas)">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
