import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ViewportPage from '@/app/layouts/ViewportPage'
import UserSearchBar from '@/features/messages/components/UserSearchBar'
import { useUserSearch } from '@/features/messages/hooks/useUserSearch'
import type { UserSearchResult } from '@/features/messages/types'
import { useSearchHistory } from '../hooks/useSearchHistory'
import type { SearchHistoryEntry } from '../types'
import SearchHistory from './SearchHistory'
import SearchResultsList from './SearchResultsList'

export default function SearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    query,
    results,
    isSearching,
    error,
    handleSearch,
    clearSearch,
  } = useUserSearch()
  const { history, addEntry, removeEntry, clearAll } = useSearchHistory()

  const handleSelectResult = useCallback(
    (selectedUser: UserSearchResult) => {
      const entry: SearchHistoryEntry = {
        id: selectedUser.id,
        username: selectedUser.username,
        name: selectedUser.name,
        photo_url: selectedUser.photo_url,
      }
      addEntry(entry)
      navigate(`/app/profile/${encodeURIComponent(selectedUser.username)}`)
    },
    [addEntry, navigate],
  )

  const handleSelectHistory = useCallback(
    (entry: SearchHistoryEntry) => {
      addEntry(entry)
      navigate(`/app/profile/${encodeURIComponent(entry.username)}`)
    },
    [addEntry, navigate],
  )

  const hasQuery = Boolean(query.trim())

  return (
    <ViewportPage
      ariaLabel={t('Search')}
      width="narrow"
      scroll="managed"
      header={
        <div className="mx-auto w-full max-w-[var(--mc-content-narrow)]">
          <p className="mc-eyebrow mb-1">{t('RefLab community')}</p>
          <p className="mb-3 text-sm text-(--mc-color-text-muted)">
            {t('Find referees by name or username.')}
          </p>
          <UserSearchBar
            query={query}
            onChange={handleSearch}
            onClear={clearSearch}
            placeholder={t('Search users...')}
          />
        </div>
      }
    >
      <div className="mc-scroll-region h-full px-3 py-4 sm:px-4 md:py-6">
        {hasQuery ? (
          <SearchResultsList
            results={results}
            isSearching={isSearching}
            error={error}
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
    </ViewportPage>
  )
}
