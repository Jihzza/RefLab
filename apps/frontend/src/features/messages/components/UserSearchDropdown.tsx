import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui'
import type { UserSearchResult } from '../types'

interface UserSearchDropdownProps {
  query: string
  results: UserSearchResult[]
  isSearching: boolean
  error?: string | null
  onSelect: (user: UserSearchResult) => void
  isOpen: boolean
}

export default function UserSearchDropdown({
  query,
  results,
  isSearching,
  error,
  onSelect,
  isOpen,
}: UserSearchDropdownProps) {
  const { t } = useTranslation()
  if (!isOpen) return null

  return (
    <div
      className="absolute left-0 right-0 top-full z-(--mc-z-popover) mt-2 max-h-80 overflow-y-auto rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) p-1 shadow-(--mc-shadow-raised)"
      role="listbox"
      aria-label={t('Search results')}
    >
      {isSearching && (
        <div className="space-y-2 p-2" role="status" aria-label={t('Searching')}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton variant="circular" width="2.25rem" />
              <div className="flex-1 space-y-1.5">
                <Skeleton variant="text" width="45%" />
                <Skeleton variant="text" width="30%" className="h-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isSearching && error && (
        <p className="px-4 py-4 text-center text-sm text-(--mc-color-danger)" role="alert">
          {t('Unable to search users. Please try again.')}
        </p>
      )}

      {!isSearching && !error && results.length === 0 && (
        <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-(--mc-color-text-muted)">
          <SearchX className="size-4" aria-hidden="true" />
          {query.trim() ? t('No users found') : t('Type to search')}
        </div>
      )}

      {!isSearching && !error && results.map((result) => {
        const displayName = result.name || result.username
        return (
          <button
            key={result.id}
            type="button"
            role="option"
            aria-selected="false"
            onClick={() => onSelect(result)}
            className="mc-focus-ring flex min-h-14 w-full items-center gap-3 rounded-(--mc-radius-button) px-3 py-2.5 text-left hover:bg-(--mc-color-surface-hover)"
          >
            {result.photo_url ? (
              <img src={result.photo_url} alt="" className="size-10 shrink-0 rounded-full border border-(--mc-color-border) object-cover" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--mc-color-accent)/15 text-xs font-bold text-(--mc-color-accent)">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-(--mc-color-text)">{displayName}</span>
              <span className="block truncate text-xs text-(--mc-color-text-muted)">@{result.username}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
