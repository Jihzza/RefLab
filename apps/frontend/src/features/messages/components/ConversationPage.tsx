import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'
import { getConversations } from '../api/messagesApi'
import { useMessages } from '../hooks/useMessages'
import type { MessageUser } from '../types'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2, MessageCircleOff } from 'lucide-react'
import Button from '@/components/ui/Button'

type LocationState = {
  otherUser?: MessageUser
}

export default function ConversationPage() {
  const { t } = useTranslation()
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const state = (location.state ?? null) as LocationState | null
  const [otherUser, setOtherUser] = useState<MessageUser | null>(
    state?.otherUser ?? null
  )

  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    error,
    loadMore,
    sendMessage,
  } = useMessages(conversationId ?? null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollSnapshotRef = useRef<{ height: number; top: number } | null>(null)

  // If we were navigated directly (no route state), fetch other user from conversations list.
  useEffect(() => {
    if (otherUser || !user?.id || !conversationId) return

    ;(async () => {
      const { data, error: convError } = await getConversations(user.id)
      if (convError) return
      const match = data.find(c => c.id === conversationId)
      if (match) setOtherUser(match.other_user)
    })()
  }, [otherUser, user?.id, conversationId])

  const lastMessageId = messages.length ? messages[messages.length - 1].id : null

  // Auto-scroll to bottom on initial load and on new message arrival.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (isLoading || isLoadingMore) return
    if (!lastMessageId) return
    el.scrollTop = el.scrollHeight
  }, [lastMessageId, isLoading, isLoadingMore])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || isLoadingMore || !hasMore) return

    if (el.scrollTop < 60) {
      scrollSnapshotRef.current = { height: el.scrollHeight, top: el.scrollTop }
      loadMore()
    }
  }, [isLoadingMore, hasMore, loadMore])

  // Maintain scroll position when older messages are prepended.
  useEffect(() => {
    const snap = scrollSnapshotRef.current
    const el = scrollRef.current
    if (!snap || !el) return

    const newHeight = el.scrollHeight
    el.scrollTop = newHeight - snap.height + snap.top
    scrollSnapshotRef.current = null
  }, [messages.length])

  const displayName = useMemo(() => {
    if (otherUser) return otherUser.name || otherUser.username
    return t('Conversation')
  }, [otherUser, t])
  const profileUsername = otherUser?.username ?? null
  const canOpenProfile = !!profileUsername

  const initials = displayName.slice(0, 2).toUpperCase()

  const identity = (
    <>
      {otherUser?.photo_url ? (
        <img
          src={otherUser.photo_url}
          alt={displayName}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-(--border-subtle)"
        />
      ) : (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-(--border-strong)"
          style={{ backgroundImage: 'var(--grad-brand)' }}
        >
          <span className="text-xs font-bold text-(--bg-primary)">{initials}</span>
        </div>
      )}

      <div className="min-w-0 text-left">
        <div className="text-sm font-semibold text-(--text-primary) truncate">
          {displayName}
        </div>
        {otherUser && (
          <div className="text-xs text-(--text-muted) truncate">
            @{otherUser.username}
          </div>
        )}
      </div>
    </>
  )

  if (!conversationId) {
    return (
      <div className="p-4">
        <p className="text-(--text-muted) text-sm">{t('Missing conversation ID.')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header under app header */}
      <div className="fixed top-16 left-0 right-0 z-40 glass border-b border-(--border-subtle) px-3 py-2.5 flex items-center gap-2">
        <button
          onClick={() => navigate('/app/messages')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors flex-shrink-0"
          aria-label={t('Back')}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        {canOpenProfile ? (
          <button
            type="button"
            onClick={() =>
              navigate(`/app/profile/${encodeURIComponent(profileUsername!)}`)
            }
            className="flex items-center gap-3 min-w-0 rounded-(--radius-button) px-1.5 py-1 -mx-1 hover:bg-(--bg-hover) transition-colors"
            aria-label={t('Open {{name}} profile', { name: displayName })}
          >
            {identity}
          </button>
        ) : (
          <div
            className="flex items-center gap-3 min-w-0 px-1.5 opacity-80"
            aria-disabled="true"
          >
            {identity}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2.5 mt-16 mb-16"
        onScroll={handleScroll}
      >
        {isLoading && (
          <div className="flex justify-center py-6" aria-live="polite" aria-busy="true" role="status">
            <Loader2 className="h-6 w-6 text-(--brand-yellow) animate-spin" aria-hidden="true" />
            <span className="sr-only">{t('Loading messages...')}</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-(--text-muted) text-sm">{error}</p>
          </div>
        )}

        {!isLoading &&
          !error &&
          messages.map(m => (
            <MessageBubble key={m.id} message={m} isOwn={m.sender_id === user?.id} />
          ))}

        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 text-(--brand-yellow) animate-spin" aria-hidden="true" />
          </div>
        )}

        {!isLoading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-16 animate-fade-up">
            <div className="w-16 h-16 mb-4 rounded-2xl surface-2 flex items-center justify-center">
              <MessageCircleOff className="h-8 w-8 text-(--text-muted)" aria-hidden="true" />
            </div>
            <p className="text-(--text-secondary) text-sm mb-4">{t('No messages yet.')}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/messages')}
            >
              {t('Back to Conversations')}
            </Button>
          </div>
        )}
      </div>

      {/* Fixed footer above bottom navigation */}
      <div className="fixed left-0 right-0 bottom-16 z-40">
        <MessageInput onSend={sendMessage} isSending={isSending} />
      </div>
    </div>
  )
}
