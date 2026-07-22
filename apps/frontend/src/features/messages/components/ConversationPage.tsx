import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, MessageCircle, UserRound } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ViewportPage from '@/app/layouts/ViewportPage'
import { EmptyState, IconButton, Skeleton, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { getConversations } from '../api/messagesApi'
import {
  isDeletedConversationPeer,
  isMessageableConversationPeer,
} from '../conversationPeer'
import { useMessages } from '../hooks/useMessages'
import type { ConversationPeer } from '../types'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

type LocationState = {
  otherUser?: ConversationPeer
}

function MessageSkeleton({ own = false }: { own?: boolean }) {
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`} aria-hidden="true">
      <Skeleton height="4rem" width="min(70%, 20rem)" className={own ? 'rounded-br-sm' : 'rounded-bl-sm'} />
    </div>
  )
}

export default function ConversationPage() {
  const { t } = useTranslation()
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const userId = user?.id
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? null) as LocationState | null
  const [otherUser, setOtherUser] = useState<ConversationPeer | null>(state?.otherUser ?? null)
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    isConversationUnavailable,
    error,
    loadMore,
    sendMessage,
  } = useMessages(conversationId ?? null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollSnapshotRef = useRef<{ height: number; top: number } | null>(null)

  useEffect(() => {
    if (otherUser || !userId || !conversationId) return
    let cancelled = false

    void (async () => {
      const { data, error: conversationsError } = await getConversations(userId)
      if (cancelled || conversationsError) return
      const match = data.find((conversation) => conversation.id === conversationId)
      if (match) setOtherUser(match.other_user)
    })()

    return () => {
      cancelled = true
    }
  }, [conversationId, otherUser, userId])

  const lastMessageId = messages.at(-1)?.id ?? null

  useEffect(() => {
    const element = scrollRef.current
    if (!element || isLoading || isLoadingMore || !lastMessageId) return
    element.scrollTop = element.scrollHeight
  }, [isLoading, isLoadingMore, lastMessageId])

  const handleScroll = useCallback(() => {
    const element = scrollRef.current
    if (!element || isLoadingMore || !hasMore || element.scrollTop >= 60) return
    scrollSnapshotRef.current = { height: element.scrollHeight, top: element.scrollTop }
    void loadMore()
  }, [hasMore, isLoadingMore, loadMore])

  useEffect(() => {
    const snapshot = scrollSnapshotRef.current
    const element = scrollRef.current
    if (!snapshot || !element) return
    element.scrollTop = element.scrollHeight - snapshot.height + snapshot.top
    scrollSnapshotRef.current = null
  }, [messages.length])

  const isDeletedPeer = isDeletedConversationPeer(otherUser)
  const isMessageablePeer = isMessageableConversationPeer(otherUser)
  const profileUsername = isMessageablePeer && !isConversationUnavailable
    ? otherUser.username
    : null
  const displayName = useMemo(() => {
    if (isDeletedConversationPeer(otherUser)) return t('Deleted account')
    if (isConversationUnavailable) return t('Conversation unavailable')
    return otherUser?.name || otherUser?.username || t('Conversation')
  }, [isConversationUnavailable, otherUser, t])
  const initials = displayName.slice(0, 2).toUpperCase()

  if (!conversationId) {
    return (
      <ViewportPage ariaLabel={t('Conversation')} width="narrow" padded>
        <Surface padding="none">
          <EmptyState icon={<MessageCircle className="size-6" />} title={t('Conversation unavailable')} description={t('Missing conversation ID.')} />
        </Surface>
      </ViewportPage>
    )
  }

  const conversationHeader = (
    <div className="mx-auto flex max-w-[var(--mc-content-standard)] items-center gap-3">
      <IconButton label={t('Back')} onClick={() => navigate('/app/messages')}>
        <ArrowLeft className="size-5" />
      </IconButton>

      <button
        type="button"
        onClick={() => {
          if (profileUsername) navigate(`/app/profile/${encodeURIComponent(profileUsername)}`)
        }}
        disabled={!profileUsername}
        className="mc-focus-ring flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-(--mc-radius-button) text-left disabled:cursor-default"
        aria-label={profileUsername ? t('Open {{name}} profile', { name: displayName }) : undefined}
      >
        {isMessageablePeer && !isConversationUnavailable && otherUser.photo_url ? (
          <img src={otherUser.photo_url} alt="" className="size-10 shrink-0 rounded-full border border-(--mc-color-border-strong) object-cover" />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-(--mc-color-accent)/35 bg-(--mc-color-accent)/15 text-xs font-bold text-(--mc-color-accent)">
            {isMessageablePeer && !isConversationUnavailable ? initials : <UserRound className="size-5" aria-hidden="true" />}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-(--mc-color-text)">{displayName}</span>
          {isDeletedPeer ? (
            <span className="block truncate text-xs text-(--mc-color-text-muted)">{t('This account no longer exists.')}</span>
          ) : isConversationUnavailable ? (
            <span className="block truncate text-xs text-(--mc-color-text-muted)">{t('You can no longer send messages in this conversation.')}</span>
          ) : profileUsername ? (
            <span className="block truncate text-xs text-(--mc-color-text-muted)">@{profileUsername}</span>
          ) : null}
        </span>
      </button>
    </div>
  )

  return (
    <ViewportPage
      ariaLabel={t('Conversation with {{name}}', { name: displayName })}
      width="standard"
      scroll="managed"
      header={conversationHeader}
      footer={isMessageablePeer && !isConversationUnavailable ? (
        <MessageInput onSend={sendMessage} isSending={isSending} />
      ) : (
        <div
          className="mx-auto w-full max-w-[var(--mc-content-standard)] rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas) px-4 py-3 text-center text-sm text-(--mc-color-text-muted)"
          role="status"
        >
          {isDeletedPeer
            ? t('You cannot send messages because the other account was deleted.')
            : isConversationUnavailable
              ? t('You can no longer send messages in this conversation.')
              : t('Loading conversation details...')}
        </div>
      )}
    >
      <div
        ref={scrollRef}
        className="mc-scroll-region h-full space-y-3 px-3 py-4 sm:px-4 md:px-6"
        onScroll={handleScroll}
        aria-live="polite"
      >
        {isLoading && (
          <div className="space-y-3" role="status" aria-label={t('Loading messages')}>
            <MessageSkeleton />
            <MessageSkeleton own />
            <MessageSkeleton />
          </div>
        )}

        {isLoadingMore && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-(--mc-color-text-muted)" role="status">
            <span className="size-5 animate-spin rounded-full border-2 border-(--mc-color-border-strong) border-t-(--mc-color-accent)" aria-hidden="true" />
            {t('Loading earlier messages')}
          </div>
        )}

        {error && !isLoading && !isConversationUnavailable && (
          <div className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm text-(--mc-color-danger)" role="alert">
            {error}
          </div>
        )}

        {!isLoading && messages.map((message) => (
          <MessageBubble key={message.id} message={message} isOwn={message.sender_id === userId} />
        ))}

        {!isLoading && !error && messages.length === 0 && (
          <EmptyState
            compact
            icon={<MessageCircle className="size-5" />}
            title={t('No messages yet.')}
            description={t('Send the first message to start this conversation.')}
          />
        )}
      </div>
    </ViewportPage>
  )
}
