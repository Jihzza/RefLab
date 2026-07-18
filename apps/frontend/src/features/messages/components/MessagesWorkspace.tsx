import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  LoaderCircle,
  MessageSquare,
} from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SplitPanePage from '@/app/layouts/SplitPanePage'
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  Skeleton,
} from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { getOrCreateConversation } from '../api/messagesApi'
import { useConversations } from '../hooks/useConversations'
import { useMessages } from '../hooks/useMessages'
import { useUserSearch } from '../hooks/useUserSearch'
import type { Conversation, MessageUser, UserSearchResult } from '../types'
import ConversationItem from './ConversationItem'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import UserSearchBar from './UserSearchBar'
import UserSearchDropdown from './UserSearchDropdown'

const SEARCH_RESULTS_ID = 'messages-user-search-results'
const LOAD_MORE_THRESHOLD_PX = 96
const STICK_TO_BOTTOM_THRESHOLD_PX = 120

type LocationState = {
  ownerId: string
  otherUser?: MessageUser
}

function ConversationSkeleton() {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-(--mc-radius-card) px-3 py-3">
      <Skeleton variant="circular" width="3rem" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton variant="text" width="52%" />
        <Skeleton variant="text" width="82%" className="h-3" />
      </div>
      <Skeleton variant="text" width="2.25rem" className="h-3" />
    </div>
  )
}

interface InboxPaneProps {
  conversations: Conversation[]
  selectedConversationId: string | null
  totalUnread: number
  isLoading: boolean
  error: string | null
  actionError: string | null
  isStarting: boolean
  query: string
  searchResults: UserSearchResult[]
  isSearching: boolean
  searchError: string | null
  onQueryChange: (value: string) => void
  onClearSearch: () => void
  onRetrySearch: () => void
  onSelectUser: (user: UserSearchResult) => void
  onOpenConversation: (conversation: Conversation) => void
  onRetryConversations: () => void
}

function InboxPane({
  conversations,
  selectedConversationId,
  totalUnread,
  isLoading,
  error,
  actionError,
  isStarting,
  query,
  searchResults,
  isSearching,
  searchError,
  onQueryChange,
  onClearSearch,
  onRetrySearch,
  onSelectUser,
  onOpenConversation,
  onRetryConversations,
}: InboxPaneProps) {
  const { t } = useTranslation()
  const dropdownOpen = Boolean(query.trim())
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1)
  const resolvedActiveSearchIndex = !isSearching
    && !searchError
    && activeSearchIndex >= 0
    && activeSearchIndex < searchResults.length
    ? activeSearchIndex
    : -1
  const activeSearchResult = resolvedActiveSearchIndex >= 0
    ? searchResults[resolvedActiveSearchIndex] ?? null
    : null
  const activeDescendantId = activeSearchResult
    ? `${SEARCH_RESULTS_ID}-option-${resolvedActiveSearchIndex}`
    : undefined

  const handleSearchChange = useCallback((value: string) => {
    setActiveSearchIndex(-1)
    onQueryChange(value)
  }, [onQueryChange])

  const handleClearSearch = useCallback(() => {
    setActiveSearchIndex(-1)
    onClearSearch()
  }, [onClearSearch])

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && dropdownOpen) {
      event.preventDefault()
      handleClearSearch()
      return
    }

    if (isSearching || searchError || searchResults.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSearchIndex(currentIndex => (
        currentIndex < searchResults.length - 1 ? currentIndex + 1 : 0
      ))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSearchIndex(currentIndex => (
        currentIndex > 0 ? currentIndex - 1 : searchResults.length - 1
      ))
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setActiveSearchIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      setActiveSearchIndex(searchResults.length - 1)
      return
    }

    if (event.key === 'Enter' && activeSearchResult) {
      event.preventDefault()
      onSelectUser(activeSearchResult)
    }
  }, [
    activeSearchResult,
    dropdownOpen,
    handleClearSearch,
    isSearching,
    onSelectUser,
    searchError,
    searchResults.length,
  ])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative z-10 shrink-0 border-b border-(--mc-color-border) bg-(--mc-color-surface) p-4">
        <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
          <h1 className="mc-page-title text-xl">{t('Messages')}</h1>
          <div className="flex items-center gap-2">
            {isStarting && (
              <LoaderCircle
                className="size-4 animate-spin text-(--mc-color-accent) motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {totalUnread > 0 && (
              <span className="mc-tabular flex min-h-6 min-w-6 items-center justify-center rounded-full bg-(--mc-color-accent) px-2 text-[11px] font-extrabold text-(--mc-color-canvas)">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <UserSearchBar
            query={query}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            disabled={isStarting}
            placeholder={t('Search')}
            isExpanded={dropdownOpen}
            resultsId={SEARCH_RESULTS_ID}
            activeDescendantId={activeDescendantId}
            onKeyDown={handleSearchKeyDown}
          />
          <UserSearchDropdown
            id={SEARCH_RESULTS_ID}
            query={query}
            results={searchResults}
            isSearching={isSearching}
            error={searchError}
            onRetry={onRetrySearch}
            onSelect={onSelectUser}
            isOpen={dropdownOpen}
            disabled={isStarting}
            activeIndex={resolvedActiveSearchIndex}
            onActiveIndexChange={setActiveSearchIndex}
          />
        </div>

        {actionError && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2 text-xs leading-5 text-(--mc-color-text-secondary)"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
            <span className="break-words">{actionError}</span>
          </div>
        )}
      </div>

      <div className="mc-scroll-region flex-1 p-2">
        {isLoading && (
          <div className="space-y-1" aria-label={t('Loading')}>
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        )}

        {!isLoading && error && (
          <EmptyState
            icon={<AlertTriangle className="size-5" />}
            title={t('Data unavailable')}
            description={t('Something went wrong loading your conversations.')}
            compact
            action={(
              <Button size="sm" variant="secondary" onClick={onRetryConversations}>
                {t('Try Again')}
              </Button>
            )}
          />
        )}

        {!isLoading && !error && conversations.length > 0 && (
          <div className="space-y-1">
            {conversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                selected={conversation.id === selectedConversationId}
                onClick={() => onOpenConversation(conversation)}
              />
            ))}
          </div>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <EmptyState
            icon={<MessageSquare className="size-5" />}
            title={t('No conversations yet')}
            description={t('Search for someone above to start a conversation.')}
            compact
          />
        )}
      </div>
    </div>
  )
}

function EmptyConversationPane() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon={<MessageSquare className="size-5" />}
        title={t('Messages')}
        description={t('Search for someone above to start a conversation.')}
      />
    </div>
  )
}

interface ConversationPaneProps {
  conversationId: string
  otherUser: MessageUser | null
  currentUserId: string | undefined
  messageState: ReturnType<typeof useMessages>
  onBack: () => void
  onOpenProfile: (username: string) => void
}

function ConversationPane({
  conversationId,
  otherUser,
  currentUserId,
  messageState,
  onBack,
  onOpenProfile,
}: ConversationPaneProps) {
  const { t } = useTranslation()
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    loadError,
    sendError,
    loadMore,
    retry,
    sendMessage,
    retryOutboxMessage,
    discardOutboxMessage,
    dismissSendError,
  } = messageState
  const participantUnavailable = Boolean(otherUser?.is_deleted || otherUser?.is_blocked)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollSnapshotRef = useRef<{ height: number; top: number } | null>(null)
  const isNearBottomRef = useRef(true)
  const initialScrollDoneRef = useRef(false)
  const previousLastMessageIdRef = useRef<string | null>(null)

  const displayName = otherUser?.is_blocked
    ? t('Blocked account')
    : participantUnavailable
      ? t('This user is unavailable.')
    : otherUser
      ? otherUser.name || otherUser.username
    : t('Conversation')
  const lastMessage = messages.at(-1) ?? null
  const lastMessageId = lastMessage?.id ?? null

  useLayoutEffect(() => {
    initialScrollDoneRef.current = false
    previousLastMessageIdRef.current = null
    scrollSnapshotRef.current = null
    isNearBottomRef.current = true
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [conversationId])

  // Restore the exact viewport after older messages are prepended. This is
  // deliberately separate from new-message auto-scroll so a 30+ item history
  // never jumps back to the newest message.
  useLayoutEffect(() => {
    const snapshot = scrollSnapshotRef.current
    const scrollElement = scrollRef.current
    if (!snapshot || !scrollElement || isLoadingMore) return

    scrollElement.scrollTop = scrollElement.scrollHeight
      - snapshot.height
      + snapshot.top
    scrollSnapshotRef.current = null
  }, [isLoadingMore, messages.length])

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement || isLoading || scrollSnapshotRef.current) return

    if (!initialScrollDoneRef.current) {
      scrollElement.scrollTop = scrollElement.scrollHeight
      initialScrollDoneRef.current = true
      isNearBottomRef.current = true
    } else if (
      lastMessageId
      && lastMessageId !== previousLastMessageIdRef.current
      && (isNearBottomRef.current || lastMessage?.sender_id === currentUserId)
    ) {
      scrollElement.scrollTop = scrollElement.scrollHeight
      isNearBottomRef.current = true
    }

    previousLastMessageIdRef.current = lastMessageId
  }, [currentUserId, isLoading, lastMessage?.sender_id, lastMessageId])

  const requestOlderMessages = useCallback(() => {
    const scrollElement = scrollRef.current
    if (
      !scrollElement
      || isLoadingMore
      || !hasMore
      || scrollSnapshotRef.current
    ) {
      return
    }

    scrollSnapshotRef.current = {
      height: scrollElement.scrollHeight,
      top: scrollElement.scrollTop,
    }
    void loadMore()
  }, [hasMore, isLoadingMore, loadMore])

  const handleScroll = useCallback(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const distanceFromBottom = scrollElement.scrollHeight
      - scrollElement.scrollTop
      - scrollElement.clientHeight
    isNearBottomRef.current = distanceFromBottom < STICK_TO_BOTTOM_THRESHOLD_PX

    if (scrollElement.scrollTop < LOAD_MORE_THRESHOLD_PX) {
      requestOlderMessages()
    }
  }, [requestOlderMessages])

  return (
    <div className="flex h-full min-h-0 flex-col bg-(--mc-color-canvas)">
      <header className="flex min-h-[4.75rem] shrink-0 items-center gap-2 border-b border-(--mc-color-border) bg-(--mc-color-surface) px-3 py-2.5 sm:px-4">
        <IconButton
          label={t('Back')}
          variant="ghost"
          size="md"
          onClick={onBack}
          className="md:hidden"
        >
          <ArrowLeft className="size-5" />
        </IconButton>

        {otherUser?.username && !participantUnavailable ? (
          <button
            type="button"
            onClick={() => onOpenProfile(otherUser.username)}
            className="mc-focus-ring flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-(--mc-radius-button) px-1 text-left hover:bg-(--mc-color-surface-hover)"
            aria-label={t('Open {{name}} profile', { name: displayName })}
          >
            <Avatar
              src={otherUser.photo_url}
              ownerId={otherUser.id}
              alt={displayName}
              name={displayName}
              size="lg"
            />
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-(--mc-color-text)">
                {displayName}
              </span>
              <span className="mt-0.5 block truncate text-xs text-(--mc-color-text-muted)">
                @{otherUser.username}
              </span>
            </span>
          </button>
        ) : (
          <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-1">
            <Avatar name={displayName} size="lg" />
            <span className="truncate text-base font-bold text-(--mc-color-text)">
              {displayName}
            </span>
          </div>
        )}

        <span aria-hidden="true" className="mc-brand-stripes hidden scale-75 sm:block" />
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="mc-scroll-region flex-1 px-4 py-4 sm:px-6 lg:px-8"
      >
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-busy={isLoading || isLoadingMore}
          className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-3"
        >
          {isLoading && (
            <div className="flex flex-1 flex-col justify-end gap-3 py-2" aria-label={t('Loading')}>
              <Skeleton width="58%" height="5rem" className="rounded-2xl" />
              <Skeleton width="66%" height="6rem" className="ml-auto rounded-2xl" />
              <Skeleton width="46%" height="4.5rem" className="rounded-2xl" />
              <Skeleton width="61%" height="5.5rem" className="ml-auto rounded-2xl" />
            </div>
          )}

          {!isLoading && isLoadingMore && (
            <div className="flex min-h-11 items-center justify-center" aria-label={t('Loading')}>
              <LoaderCircle
                className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none"
                aria-hidden="true"
              />
            </div>
          )}

          {!isLoading && loadError && messages.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={<AlertTriangle className="size-5" />}
                title={t('Data unavailable')}
                description={loadError}
                action={(
                  <Button size="sm" variant="secondary" onClick={retry}>
                    {t('Try Again')}
                  </Button>
                )}
              />
            </div>
          )}

          {!isLoading && loadError && messages.length > 0 && (
            <div
              role="alert"
              className="mx-auto flex max-w-lg items-center justify-between gap-3 rounded-(--mc-radius-input) border border-(--mc-color-danger)/45 bg-(--mc-color-danger)/10 px-3 py-2 text-xs text-(--mc-color-text-secondary)"
            >
              <span className="min-w-0 break-words">{loadError}</span>
              <Button size="sm" variant="ghost" onClick={requestOlderMessages}>
                {t('Try Again')}
              </Button>
            </div>
          )}

          {!isLoading && messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
              onRetry={clientId => void retryOutboxMessage(clientId)}
              onDiscard={clientId => void discardOutboxMessage(clientId)}
            />
          ))}

          {!isLoading && !loadError && messages.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={<MessageSquare className="size-5" />}
                title={t('No messages yet.')}
                description={t('Write a message...')}
                compact
              />
            </div>
          )}
        </div>
      </div>

      <MessageInput
        onSend={sendMessage}
        isSending={isSending}
        disabled={isLoading || participantUnavailable}
        error={sendError}
        onDismissError={dismissSendError}
      />
    </div>
  )
}

export default function MessagesWorkspace() {
  const { t } = useTranslation()
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state ?? null) as LocationState | null
  const ownedRouteState = routeState?.ownerId === user?.id ? routeState : null
  const activeConversationId = conversationId ?? null
  const {
    conversations,
    totalUnread,
    isLoading,
    error,
    refresh,
  } = useConversations()
  const {
    query,
    results,
    isSearching,
    error: searchError,
    handleSearch,
    clearSearch,
    retrySearch,
  } = useUserSearch()
  const [actionError, setActionError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const isStartingRef = useRef(false)

  const activeConversation = useMemo(() => conversations.find(
    conversation => conversation.id === activeConversationId,
  ) ?? null, [activeConversationId, conversations])
  const messageState = useMessages(
    activeConversationId,
    refresh,
    Boolean(
      activeConversation?.other_user.is_deleted
      || activeConversation?.other_user.is_blocked,
    ),
  )

  // Replace stale profile data kept in this route's history state as soon as
  // the server exposes the privacy-safe deleted-account tombstone.
  useEffect(() => {
    const tombstone = activeConversation?.other_user
    const isUnavailable = tombstone?.is_deleted || tombstone?.is_blocked
    const routeIsUnavailable = ownedRouteState?.otherUser?.is_deleted
      || ownedRouteState?.otherUser?.is_blocked
    if (!user?.id || !isUnavailable || routeIsUnavailable) return
    navigate(location.pathname, {
      replace: true,
      state: { ownerId: user.id, otherUser: tombstone } satisfies LocationState,
    })
  }, [
    activeConversation,
    location.pathname,
    navigate,
    ownedRouteState?.otherUser?.is_blocked,
    ownedRouteState?.otherUser?.is_deleted,
    user?.id,
  ])

  const otherUser = activeConversation?.other_user
    ?? ownedRouteState?.otherUser
    ?? messageState.messages.find(message => (
      message.conversation_id === activeConversationId
      && message.sender_id !== user?.id
    ))?.sender
    ?? null

  const handleSelectUser = useCallback(async (selectedUser: UserSearchResult) => {
    if (!user?.id || isStartingRef.current) return

    isStartingRef.current = true
    setIsStarting(true)
    setActionError(null)
    try {
      const { data: nextConversationId, error: startError } = await getOrCreateConversation(
        user.id,
        selectedUser.id,
      )

      if (startError || !nextConversationId) {
        setActionError(startError?.message ?? t('Failed to start conversation.'))
        return
      }

      clearSearch()
      navigate(`/app/messages/${nextConversationId}`, {
        state: { ownerId: user.id, otherUser: selectedUser } satisfies LocationState,
      })
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t('Failed to start conversation.'),
      )
    } finally {
      isStartingRef.current = false
      setIsStarting(false)
    }
  }, [clearSearch, navigate, t, user])

  const handleOpenConversation = useCallback((conversation: Conversation) => {
    if (!user?.id) return
    setActionError(null)
    clearSearch()
    navigate(`/app/messages/${conversation.id}`, {
      state: {
        ownerId: user.id,
        otherUser: conversation.other_user,
      } satisfies LocationState,
    })
  }, [clearSearch, navigate, user?.id])

  const handleQueryChange = useCallback((value: string) => {
    setActionError(null)
    handleSearch(value)
  }, [handleSearch])

  const inbox = (
    <InboxPane
      conversations={conversations}
      selectedConversationId={activeConversationId}
      totalUnread={totalUnread}
      isLoading={isLoading}
      error={error}
      actionError={actionError}
      isStarting={isStarting}
      query={query}
      searchResults={results}
      isSearching={isSearching}
      searchError={searchError}
      onQueryChange={handleQueryChange}
      onClearSearch={clearSearch}
      onRetrySearch={retrySearch}
      onSelectUser={handleSelectUser}
      onOpenConversation={handleOpenConversation}
      onRetryConversations={() => void refresh()}
    />
  )

  const conversation = activeConversationId ? (
    <ConversationPane
      key={activeConversationId}
      conversationId={activeConversationId}
      otherUser={otherUser}
      currentUserId={user?.id}
      messageState={messageState}
      onBack={() => navigate('/app/messages')}
      onOpenProfile={username => navigate(`/app/profile/${encodeURIComponent(username)}`)}
    />
  ) : (
    <EmptyConversationPane />
  )

  return (
    <SplitPanePage
      ariaLabel={t('Messages')}
      primaryLabel={t('Messages')}
      secondaryLabel={t('Conversation')}
      primary={inbox}
      secondary={conversation}
      mobilePane={activeConversationId ? 'secondary' : 'primary'}
      primaryWidth="standard"
      primaryScroll="managed"
      secondaryScroll="managed"
    />
  )
}
