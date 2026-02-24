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
      <div className="flex items-center justify-center py-8" role="status" aria-label={t('Searching')}>
        <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No results found
  if (results.length === 0 && query.trim()) {
    return (
      <p className="px-4 py-8 text-center text-sm text-(--text-muted)">
        {t('No users found for "{{query}}"', { query })}
      </p>
    )
  }

  // Results list
  return (
    <div>
      {results.map(user => (
        <SearchResultItem
          key={user.id}
          user={user}
          onClick={() => onSelect(user)}
        />
      ))}
    </div>
  )
}
