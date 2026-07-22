import { SearchX, UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState, Skeleton, Surface } from '@/components/ui'
import type { UserSearchResult } from '@/features/messages/types'
import SearchResultItem from './SearchResultItem'

interface SearchResultsListProps {
  results: UserSearchResult[]
  isSearching: boolean
  error?: string | null
  query: string
  onSelect: (user: UserSearchResult) => void
}

export default function SearchResultsList({
  results,
  isSearching,
  error,
  query,
  onSelect,
}: SearchResultsListProps) {
  const { t } = useTranslation()

  if (isSearching) {
    return (
      <div className="space-y-3" role="status" aria-label={t('Searching')}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Surface key={index} className="flex items-center gap-3" padding="sm">
            <Skeleton variant="circular" width="2.75rem" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="45%" />
              <Skeleton variant="text" width="30%" className="h-3" />
            </div>
          </Surface>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Surface padding="none">
        <EmptyState
          icon={<SearchX className="size-6" />}
          title={t('Unable to search users')}
          description={t('Please check your connection and try again.')}
        />
      </Surface>
    )
  }

  if (results.length === 0 && query.trim()) {
    return (
      <Surface padding="none">
        <EmptyState
          icon={<SearchX className="size-6" />}
          title={t('No users found')}
          description={t('No users found for "{{query}}"', { query })}
        />
      </Surface>
    )
  }

  return (
    <div className="space-y-3" role="list" aria-label={t('Search results')}>
      <div className="flex items-center gap-2 pb-1 text-xs font-semibold text-(--mc-color-text-muted)">
        <UsersRound className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
        {t('{{count}} results', { count: results.length })}
      </div>
      {results.map((result) => (
        <SearchResultItem key={result.id} user={result} onClick={() => onSelect(result)} />
      ))}
    </div>
  )
}
