import { useCallback } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UserSearchResult } from '@/features/messages/types'
import type { SearchHistoryEntry } from '../types'
import { useProfileSearch } from '../hooks/useProfileSearch'
import { useSearchHistory } from '../hooks/useSearchHistory'
import SearchHistory from './SearchHistory'
import SearchInput from './SearchInput'
import SearchResultsList from './SearchResultsList'

export default function SearchPage() {
  const { t } = useTranslation()
  const {
    query,
    results,
    isSearching,
    error,
    handleSearch,
    clearSearch,
    retrySearch,
  } = useProfileSearch()
  const { history, addEntry, removeEntry, clearAll } = useSearchHistory()

  const handleSelectResult = useCallback(
    (user: UserSearchResult) => {
      const entry: SearchHistoryEntry = {
        id: user.id,
        username: user.username,
        name: user.name,
        photo_url: user.photo_url,
      }
      addEntry(entry)
    },
    [addEntry],
  )

  const handleSelectHistory = useCallback(
    (entry: SearchHistoryEntry) => {
      addEntry(entry)
    },
    [addEntry],
  )

  const hasQuery = Boolean(query.trim())

  return (
    <div className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
      <div className="mx-auto w-full max-w-4xl px-4 pb-4 pt-5 sm:px-6 sm:pt-7 xl:px-8">
        <header className="mb-4 sm:mb-5">
          <h1
            id="search-page-title"
            className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-(--mc-color-text) sm:text-3xl"
          >
            {t('Search')}
          </h1>
        </header>

        <div
          className="relative overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface) p-4 shadow-(--mc-shadow-soft) sm:p-5"
        >
          <span className="pointer-events-none absolute -left-8 top-0 h-24 w-16 -skew-x-[24deg] bg-(--mc-color-accent)" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-6 -right-4 h-20 w-10 -skew-x-[24deg] bg-(--mc-color-danger)" aria-hidden="true" />
          <span
            className="pointer-events-none absolute inset-y-0 right-10 w-36 opacity-[0.045]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(112deg, transparent 0 10px, var(--mc-color-text) 10px 15px)',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 pl-3 sm:pl-4">
              <span className="flex size-8 items-center justify-center rounded-full border border-(--mc-color-accent)/60 bg-(--mc-color-canvas)/70 text-(--mc-color-accent)">
                <Search className="size-4" aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold tracking-[0.08em] text-(--mc-color-accent) uppercase">
                {t('Type to search')}
              </p>
            </div>

            <SearchInput
              value={query}
              onChange={handleSearch}
              onClear={clearSearch}
              placeholder="Search users..."
              isLoading={isSearching}
            />
          </div>
        </div>

        <div className="mt-4 sm:mt-5">
          {hasQuery ? (
            <SearchResultsList
              results={results}
              isSearching={isSearching}
              error={error}
              query={query}
              onSelect={handleSelectResult}
              onRetry={retrySearch}
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
    </div>
  )
}
