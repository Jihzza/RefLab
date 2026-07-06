import { SearchX } from 'lucide-react'
import type { UserSearchResult } from '@/features/messages/types'
import SearchResultItem from './SearchResultItem'
import { useTranslation } from 'react-i18next'

interface SearchResultsListProps {
  results: UserSearchResult[]
  isSearching: boolean
  query: string
  onSelect: (user: UserSearchResult) => void
}

/**
 * Renders live search results with loading and empty states.
 */
export default function SearchResultsList({
  results,
  isSearching,
  query,
  onSelect,
}: SearchResultsListProps) {
  const { t } = useTranslation()

  // Loading spinner
  if (isSearching) {
    return (
      <div
        className="flex items-center justify-center gap-2.5 py-10 text-(--text-muted)"
        role="status"
        aria-label={t('Searching')}
      >
        <div className="w-4.5 h-4.5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">{t('Searching')}</span>
      </div>
    )
  }

  // No results found
  if (results.length === 0 && query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-16 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-(--bg-surface-2) border border-(--border-subtle) flex items-center justify-center mb-4">
          <SearchX className="w-7 h-7 text-(--text-muted)" aria-hidden="true" />
        </div>
        <p className="text-(--text-primary) text-sm font-semibold">
          {t('No users found')}
        </p>
        <p className="text-(--text-muted) text-xs mt-1.5">
          {t('No users found for "{{query}}"', { query })}
        </p>
      </div>
    )
  }

  // Results list
  return (
    <div className="px-3 py-2 space-y-1">
      {results.map((user) => (
        <SearchResultItem
          key={user.id}
          user={user}
          onClick={() => onSelect(user)}
        />
      ))}
    </div>
  )
}
