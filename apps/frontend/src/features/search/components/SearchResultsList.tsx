import type { UserSearchResult } from '@/features/messages/types'
import SearchResultItem from './SearchResultItem'

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
  // Loading spinner
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-8" role="status" aria-label="Searching">
        <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // No results found
  if (results.length === 0 && query.trim()) {
    return (
      <p className="px-4 py-8 text-center text-sm text-(--text-muted)">
        No users found for &ldquo;{query}&rdquo;
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
