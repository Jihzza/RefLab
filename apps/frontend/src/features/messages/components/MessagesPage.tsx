import { useState } from 'react'
import { MessageSquarePlus, MessagesSquare, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ViewportPage from '@/app/layouts/ViewportPage'
import { Button, EmptyState, Skeleton, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { getOrCreateConversation } from '../api/messagesApi'
import { useConversations } from '../hooks/useConversations'
import { useUserSearch } from '../hooks/useUserSearch'
import type { UserSearchResult } from '../types'
import ConversationItem from './ConversationItem'
import UserSearchBar from './UserSearchBar'
import UserSearchDropdown from './UserSearchDropdown'

function ConversationSkeleton() {
  return (
    <Surface className="flex items-center gap-3" padding="sm" aria-hidden="true">
      <Skeleton variant="circular" width="3rem" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton variant="text" width="8rem" />
        <Skeleton variant="text" width="70%" className="h-3" />
      </div>
      <Skeleton variant="text" width="2.5rem" className="h-3" />
    </Surface>
  )
}

export default function MessagesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversations, isLoading, error: conversationsError, refresh } = useConversations()
  const {
    query,
    results,
    isSearching,
    error: searchError,
    handleSearch,
    clearSearch,
  } = useUserSearch()
  const [actionError, setActionError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  async function handleSelectUser(selectedUser: UserSearchResult) {
    if (!user?.id) return
    setIsStarting(true)
    setActionError(null)

    const { data: conversationId, error: startError } = await getOrCreateConversation(
      user.id,
      selectedUser.id,
    )
    setIsStarting(false)

    if (startError || !conversationId) {
      setActionError(startError?.message ?? t('Failed to start conversation.'))
      return
    }

    clearSearch()
    navigate(`/app/messages/${conversationId}`, { state: { otherUser: selectedUser } })
  }

  return (
    <ViewportPage
      ariaLabel={t('Messages')}
      width="standard"
      padded
      header={
        <div className="mx-auto w-full max-w-[var(--mc-content-standard)]">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="mc-eyebrow">{t('Direct communication')}</p>
              <p className="mt-1 text-sm text-(--mc-color-text-muted)">
                {t('Find a referee and start a private conversation.')}
              </p>
            </div>
            {isStarting && <span className="text-xs text-(--mc-color-accent)" role="status">{t('Opening...')}</span>}
          </div>

          <div className="relative">
            <UserSearchBar
              query={query}
              onChange={handleSearch}
              onClear={clearSearch}
              disabled={!user?.id || isStarting}
              placeholder={t('Search users...')}
            />
            <UserSearchDropdown
              query={query}
              results={results}
              isSearching={isSearching}
              error={searchError}
              onSelect={(selectedUser) => void handleSelectUser(selectedUser)}
              isOpen={Boolean(query.trim())}
            />
          </div>
        </div>
      }
    >
      {(actionError || searchError) && (
        <div className="mb-4 rounded-(--mc-radius-input) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm text-(--mc-color-danger)" role="alert">
          {actionError || searchError}
        </div>
      )}

      {isLoading && (
        <div className="space-y-3" role="status" aria-label={t('Loading conversations')}>
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
        </div>
      )}

      {conversationsError && !isLoading && (
        <Surface padding="none">
          <EmptyState
            icon={<RefreshCw className="size-6" />}
            title={t('Unable to load conversations')}
            description={t('Something went wrong loading your conversations.')}
            action={<Button onClick={() => void refresh()}>{t('Try Again')}</Button>}
          />
        </Surface>
      )}

      {!isLoading && !conversationsError && conversations.length > 0 && (
        <div className="space-y-3" role="list" aria-label={t('Conversations')}>
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              onClick={() => navigate(`/app/messages/${conversation.id}`, { state: { otherUser: conversation.other_user } })}
            />
          ))}
        </div>
      )}

      {!isLoading && !conversationsError && conversations.length === 0 && (
        <Surface padding="none">
          <EmptyState
            icon={<MessagesSquare className="size-6" />}
            title={t('No conversations yet')}
            description={t('Search for someone above to start a conversation.')}
            action={
              <Button variant="secondary" leadingIcon={<MessageSquarePlus className="size-4" />} onClick={() => document.querySelector<HTMLInputElement>('[data-user-search]')?.focus()}>
                {t('Find someone')}
              </Button>
            }
          />
        </Surface>
      )}
    </ViewportPage>
  )
}
