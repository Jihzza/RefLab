import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'
import { getOrCreateConversation } from '../api/messagesApi'
import { useConversations } from '../hooks/useConversations'
import { useUserSearch } from '../hooks/useUserSearch'
import type { UserSearchResult } from '../types'
import ConversationItem from './ConversationItem'
import UserSearchBar from './UserSearchBar'
import UserSearchDropdown from './UserSearchDropdown'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import { MessagesSquare, AlertTriangle } from 'lucide-react'

function ConversationSkeleton() {
  return (
    <div className="card-console p-3.5 flex items-center gap-3.5">
      <div className="w-12 h-12 rounded-full skeleton flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-28 rounded skeleton" />
        <div className="h-2.5 w-48 rounded skeleton" />
      </div>
      <div className="space-y-2 flex flex-col items-end">
        <div className="h-2.5 w-10 rounded skeleton" />
        <div className="h-5 w-5 rounded-full skeleton" />
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const { conversations, isLoading, error, refresh } = useConversations()
  const { query, results, isSearching, handleSearch, clearSearch } =
    useUserSearch()

  const [actionError, setActionError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const handleSelectUser = useCallback(
    async (u: UserSearchResult) => {
      if (!user?.id) return

      setIsStarting(true)
      setActionError(null)

      const { data: conversationId, error: startError } =
        await getOrCreateConversation(user.id, u.id)

      setIsStarting(false)

      if (startError || !conversationId) {
        setActionError(startError?.message ?? t('Failed to start conversation.'))
        return
      }

      clearSearch()
      navigate(`/app/messages/${conversationId}`, { state: { otherUser: u } })
    },
    [user?.id, navigate, clearSearch]
  )

  const handleOpenConversation = useCallback(
    (conversationId: string, otherUser: UserSearchResult) => {
      navigate(`/app/messages/${conversationId}`, { state: { otherUser } })
    },
    [navigate]
  )

  const dropdownOpen = !!query.trim()

  return (
    <div className="flex flex-col h-full">
      <div className="glass sticky top-0 z-30 p-4 pb-3 border-b border-(--border-subtle)">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-5 w-1.5 rounded-full flag-accent" aria-hidden="true" />
          <h1 className="text-lg font-bold text-(--text-primary)">{t('Messages')}</h1>
        </div>
        <div className="relative">
          <UserSearchBar
            query={query}
            onChange={handleSearch}
            onClear={clearSearch}
            disabled={!user?.id || isStarting}
            placeholder={t('Search')}
          />

          <UserSearchDropdown
            query={query}
            results={results}
            isSearching={isSearching}
            onSelect={handleSelectUser}
            isOpen={dropdownOpen}
          />
        </div>

        {actionError && (
          <div className="mt-3 p-3 bg-(--error)/10 border border-(--error)/20 rounded-(--radius-input) text-sm text-(--error)">
            {actionError}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-2.5 py-3 pb-20">
        {isLoading && (
          <div className="space-y-2.5">
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        )}

        {error && !isLoading && (
          <div className="card-console mt-4 flex flex-col items-center text-center px-6 py-12 animate-fade-up">
            <div className="w-14 h-14 mb-4 rounded-full bg-(--error)/10 border border-(--error)/20 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-(--error)" aria-hidden="true" />
            </div>
            <p className="text-(--text-secondary) text-sm mb-4">
              {t('Something went wrong loading your conversations.')}
            </p>
            <Button variant="primary" size="sm" onClick={refresh}>
              {t('Try Again')}
            </Button>
          </div>
        )}

        {!isLoading &&
          !error &&
          conversations.map(c => (
            <ConversationItem
              key={c.id}
              conversation={c}
              onClick={() => handleOpenConversation(c.id, c.other_user)}
            />
          ))}

        {!isLoading && !error && conversations.length === 0 && (
          <div className="flex flex-col items-center text-center py-16 animate-fade-up">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl surface-2 flex items-center justify-center">
              <MessagesSquare className="h-8 w-8 text-(--brand-yellow)" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-(--text-primary) mb-1">
              {t('No conversations yet')}
            </h3>
            <p className="text-sm text-(--text-muted) max-w-xs">
              {t('Search for someone above to start a conversation.')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
