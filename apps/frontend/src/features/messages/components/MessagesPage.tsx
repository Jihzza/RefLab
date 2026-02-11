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

function ConversationSkeleton() {
  return (
    <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-4 animate-pulse flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-(--bg-surface-2)" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-28 bg-(--bg-surface-2) rounded" />
        <div className="h-2 w-48 bg-(--bg-surface-2) rounded" />
      </div>
      <div className="space-y-2 flex flex-col items-end">
        <div className="h-2 w-10 bg-(--bg-surface-2) rounded" />
        <div className="h-5 w-5 bg-(--bg-surface-2) rounded-full" />
      </div>
    </div>
  )
}

export default function MessagesPage() {
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
        setActionError(startError?.message ?? 'Failed to start conversation.')
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
      <div className="p-4 pb-2">
        <div className="relative">
          <UserSearchBar
            query={query}
            onChange={handleSearch}
            onClear={clearSearch}
            disabled={!user?.id || isStarting}
            placeholder="Search"
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
          <div className="mt-3 p-3 bg-(--error)/10 border border-(--error)/20 rounded-lg text-sm text-(--error)">
            {actionError}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3 py-3 pb-20">
        {isLoading && (
          <div className="space-y-3">
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-(--text-muted) text-sm mb-3">
              Something went wrong loading your conversations.
            </p>
            <button
              onClick={refresh}
              className="px-4 py-2 text-sm font-medium bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors"
            >
              Try Again
            </button>
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
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-(--bg-surface-2) flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-(--text-muted)"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9 6l3.36-1.68c.32-.16.53-.49.53-.85V6.75A2.25 2.25 0 019.64 4.5h8.11A2.25 2.25 0 0120 6.75v6A2.25 2.25 0 0117.75 15H9.54c-.35 0-.69.08-1 .23L3 18.75z"
                />
              </svg>
            </div>
            <h3 className="text-base font-medium text-(--text-primary) mb-1">
              No conversations yet
            </h3>
            <p className="text-sm text-(--text-muted)">
              Search for someone above to start a conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
