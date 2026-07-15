import { AlertTriangle, Search, SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Skeleton, Surface } from '@/components/ui'
import type { UserSearchResult } from '@/features/messages/types'
import SearchResultItem from './SearchResultItem'

interface SearchResultsListProps {
  results: UserSearchResult[]
  isSearching: boolean
  error?: string | null
  query: string
  onSelect: (user: UserSearchResult) => void
  onRetry?: () => void
}

export default function SearchResultsList({
  results,
  isSearching,
  error = null,
  query,
  onSelect,
  onRetry,
}: SearchResultsListProps) {
  const { t, i18n } = useTranslation()

  if (isSearching) {
    return (
      <Surface
        padding="none"
        className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
        role="status"
        aria-label={t('Searching')}
        aria-live="polite"
      >
        <div className="flex min-h-12 items-center gap-2 border-b border-(--mc-color-border) px-4 py-3">
          <span className="size-4 animate-spin rounded-full border-2 border-(--mc-color-accent) border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
          <span className="text-sm font-semibold text-(--mc-color-text-secondary)">{t('Searching')}</span>
        </div>
        <div className="divide-y divide-(--mc-color-border)">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex min-h-[72px] items-center gap-3 px-4 py-3" aria-hidden="true">
              <Skeleton variant="circular" width="3rem" height="3rem" />
              <div className="min-w-0 flex-1">
                <Skeleton variant="text" width={`${56 + index * 7}%`} />
                <Skeleton variant="text" width={`${38 + index * 5}%`} height="0.7rem" className="mt-2" />
              </div>
            </div>
          ))}
        </div>
      </Surface>
    )
  }

  if (error) {
    const errorMessage = i18n.resolvedLanguage?.toLowerCase().startsWith('pt')
      ? 'Não foi possível pesquisar utilizadores. Tenta novamente.'
      : 'Unable to search users. Please try again.'

    return (
      <Surface
        padding="none"
        className="overflow-hidden border-(--mc-color-danger)/35 shadow-none"
        role="alert"
      >
        <EmptyState
          compact
          icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
          title={t('Search')}
          description={errorMessage}
          action={onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {t('Try Again')}
            </Button>
          ) : undefined}
        />
      </Surface>
    )
  }

  if (results.length === 0 && query.trim()) {
    return (
      <Surface
        padding="none"
        className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
        role="status"
        aria-live="polite"
      >
        <EmptyState
          compact
          icon={<SearchX className="size-5" />}
          title={t('No users found')}
          description={t('No users found for "{{query}}"', { query })}
        />
      </Surface>
    )
  }

  const resultAnnouncement = results.length === 1
    ? t('{{count}} search result', { count: results.length })
    : t('{{count}} search results', { count: results.length })

  return (
    <Surface
      padding="none"
      className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
      role="region"
      aria-label={t('Search results')}
    >
      <span className="sr-only" role="status" aria-live="polite">{resultAnnouncement}</span>
      <div className="flex min-h-12 items-center gap-2 border-b border-(--mc-color-border) px-4 py-3">
        <Search className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-(--mc-color-text)">
          {t('Search')}
        </h2>
        <span className="rounded-(--mc-radius-pill) border border-(--mc-color-accent)/30 bg-(--mc-color-accent)/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-(--mc-color-accent)">
          {results.length}
        </span>
      </div>

      <ul className="divide-y divide-(--mc-color-border)">
        {results.map((user) => (
          <li key={user.id} className="list-none">
            <SearchResultItem
              user={user}
              onClick={() => onSelect(user)}
            />
          </li>
        ))}
      </ul>
    </Surface>
  )
}
