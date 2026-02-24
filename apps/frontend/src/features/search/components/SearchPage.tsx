import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import UserSearchBar from '@/features/messages/components/UserSearchBar'
import { useUserSearch } from '@/features/messages/hooks/useUserSearch'
import type { UserSearchResult } from '@/features/messages/types'
import { useSearchHistory } from '../hooks/useSearchHistory'
import type { SearchHistoryEntry } from '../types'
import SearchResultsList from './SearchResultsList'
import SearchHistory from './SearchHistory'
import { useTranslation } from 'react-i18next'

/**
 * Search page — lets users search for other users in real time
 * and keeps a history of recently visited profiles.
 */
export default function SearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Live search (debounced, with stale-request handling)
  const { query, results, isSearching, handleSearch, clearSearch } =
    useUserSearch()

  // Search history (localStorage-backed, max 10 entries)
  const { history, addEntry, removeEntry, clearAll } = useSearchHistory()

  /** Save user to history and navigate to their profile. */
  const handleSelectResult = useCallback(
    (user: UserSearchResult) => {
      const entry: SearchHistoryEntry = {
        id: user.id,
        username: user.username,
        name: user.name,
        photo_url: user.photo_url,
      }
      addEntry(entry)
      navigate(`/app/profile/${encodeURIComponent(user.username)}`)
    },
    [addEntry, navigate],
  )

  /** Bump history entry to top and navigate to their profile. */
  const handleSelectHistory = useCallback(
    (entry: SearchHistoryEntry) => {
      addEntry(entry)
      navigate(`/app/profile/${encodeURIComponent(entry.username)}`)
    },
    [addEntry, navigate],
  )

  const hasQuery = !!query.trim()

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 pb-2">
        <UserSearchBar
          query={query}
          onChange={handleSearch}
          onClear={clearSearch}
          placeholder={t('Search users...')}
        />
      </div>

      {/* Content: live results when typing, history when idle */}
      <div className="flex-1 overflow-y-auto pb-20">
        {hasQuery ? (
          <SearchResultsList
            results={results}
            isSearching={isSearching}
            query={query}
            onSelect={handleSelectResult}
          />
        ) : (
          <SearchHistory
            history={history}
            onSelect={handleSelectHistory}
            onRemove={removeEntry}
            onClearAll={clearAll}
          />
        )}
      </div>
    </div>
  )
}
