import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Users } from 'lucide-react'
import Input from '@/components/ui/Input'
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
      {/* Sticky search header */}
      <div className="sticky top-0 z-10 glass border-b border-(--border-subtle)">
        <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-3">
          <h1 className="text-lg font-bold text-(--text-primary) mb-3">
            {t('Search')}
          </h1>
          <Input
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                clearSearch()
              }
            }}
            placeholder={t('Search users...')}
            aria-label={t('Search users...')}
            leftIcon={<Search className="w-4.5 h-4.5" />}
            rightSlot={
              hasQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label={t('Clear search')}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Content: live results when typing, history when idle */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto w-full">
          {hasQuery ? (
            <SearchResultsList
              results={results}
              isSearching={isSearching}
              query={query}
              onSelect={handleSelectResult}
            />
          ) : history.length > 0 ? (
            <SearchHistory
              history={history}
              onSelect={handleSelectHistory}
              onRemove={removeEntry}
              onClearAll={clearAll}
            />
          ) : (
            /* Idle empty state — no history yet */
            <div className="flex flex-col items-center justify-center text-center px-6 py-20">
              <div className="w-16 h-16 rounded-full bg-(--bg-surface-2) border border-(--border-subtle) flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-(--text-muted)" aria-hidden="true" />
              </div>
              <p className="text-(--text-primary) text-sm font-semibold">
                {t('Find people on RefLab')}
              </p>
              <p className="text-(--text-muted) text-xs mt-1.5 max-w-xs">
                {t('Search by name or username to view referee profiles and follow them.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
