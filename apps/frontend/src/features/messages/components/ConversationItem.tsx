import type { Conversation } from '../types'
import { useAuth } from '@/features/auth/components/useAuth'

interface ConversationItemProps {
  conversation: Conversation
  onClick: () => void
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'now'
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
  currentUserId?: string
): string {
  const last = conversation.last_message
  if (!last) return 'No messages yet'

  const text = last.content?.trim()
  let preview = text ?? ''

  if (!preview) {
    if (last.media_type === 'image') preview = '[Image]'
    else if (last.media_type === 'video') preview = '[Video]'
    else if (last.media_type === 'audio') preview = '[Audio]'
    else preview = 'No messages yet'
  }

  if (currentUserId && last.sender_id === currentUserId) {
    return `You: ${preview}`
  }

  return preview
}

export default function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const { user: authUser } = useAuth()
  const otherUser = conversation.other_user
  const displayName = otherUser.name || otherUser.username
  const initials = displayName.slice(0, 2).toUpperCase()

  const preview = getLastMessagePreview(conversation, authUser?.id)
  const timestamp = formatRelativeTime(
    conversation.last_message?.created_at ?? conversation.updated_at
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-4 flex items-center gap-3 hover:bg-(--bg-hover) transition-colors"
    >
      {/* Avatar */}
      {otherUser.photo_url ? (
        <img
          src={otherUser.photo_url}
          alt={displayName}
          className="w-11 h-11 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-(--bg-primary)">
            {initials}
          </span>
        </div>
      )}

      {/* Middle */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-(--text-primary) truncate">
          {displayName}
        </div>
        <div className="text-xs text-(--text-muted) truncate">
          {preview}
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] text-(--text-muted)">{timestamp}</span>
        {conversation.unread_count > 0 && (
          <span className="min-w-5 h-5 px-1 rounded-full bg-(--brand-yellow) text-(--bg-primary) text-[10px] font-bold flex items-center justify-center">
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </span>
        )}
      </div>
    </button>
  )
}
