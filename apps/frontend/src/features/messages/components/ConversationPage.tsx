import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'
import { getConversations } from '../api/messagesApi'
import { useMessages } from '../hooks/useMessages'
import type { MessageUser } from '../types'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import { useTranslation } from 'react-i18next'

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
      <div className="fixed top-16 left-0 right-0 z-40 bg-(--bg-surface) border-b border-(--border-subtle) px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/app/messages')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors"
          aria-label={t('Back')}
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {canOpenProfile ? (
          <button
            type="button"
            onClick={() =>
              navigate(`/app/profile/${encodeURIComponent(profileUsername!)}`)
            }
            className="flex items-center gap-3 min-w-0"
            aria-label={t('Open {{name}} profile', { name: displayName })}
          >
            {otherUser?.photo_url ? (
              <img
                src={otherUser.photo_url}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-(--bg-primary)">
                  {initials}
                </span>
              </div>
            )}

            <div className="min-w-0">
              <div className="text-sm font-semibold text-(--text-primary) truncate">
                {displayName}
              </div>
              {otherUser && (
                <div className="text-xs text-(--text-muted) truncate">
                  @{otherUser.username}
                </div>
              )}
            </div>
          </button>
        ) : (
          <div
            className="flex items-center gap-3 min-w-0 opacity-80"
            aria-disabled="true"
          >
            {otherUser?.photo_url ? (
              <img
                src={otherUser.photo_url}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-(--bg-primary)">
                  {initials}
                </span>
              </div>
            )}

            <div className="min-w-0">
              <div className="text-sm font-semibold text-(--text-primary) truncate">
                {displayName}
              </div>
              {otherUser && (
                <div className="text-xs text-(--text-muted) truncate">
                  @{otherUser.username}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 mt-16 mb-16"
        onScroll={handleScroll}
      >
        {isLoading && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
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
            <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && !error && messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-(--text-muted) text-sm">{t('No messages yet.')}</p>
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
