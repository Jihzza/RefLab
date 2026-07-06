import type { UserSearchResult } from '../types'
import { useTranslation } from 'react-i18next'
import { Loader2, Search, UserX } from 'lucide-react'

interface UserSearchDropdownProps {
  query: string
  results: UserSearchResult[]
  isSearching: boolean
  onSelect: (user: UserSearchResult) => void
  isOpen: boolean
}

export default function UserSearchDropdown({
  query,
  results,
  isSearching,
  onSelect,
  isOpen,
}: UserSearchDropdownProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div
      className="card-console absolute top-full left-0 right-0 mt-2 z-20 overflow-hidden shadow-[var(--shadow-pop)] animate-scale-in origin-top"
      role="listbox"
    >
      {isSearching && (
        <div
          className="flex items-center justify-center gap-2 py-5 text-(--text-muted)"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin text-(--brand-yellow)" aria-hidden="true" />
          <span className="text-sm">{t('Searching...')}</span>
        </div>
      )}

      {!isSearching && results.length === 0 && (
        <div
          className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center"
          role="status"
        >
          {query.trim() ? (
            <UserX className="h-6 w-6 text-(--text-faint)" aria-hidden="true" />
          ) : (
            <Search className="h-6 w-6 text-(--text-faint)" aria-hidden="true" />
          )}
          <span className="text-sm text-(--text-muted)">
            {query.trim() ? t('No users found') : t('Type to search')}
          </span>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="max-h-72 overflow-y-auto p-1.5">
          {results.map(user => {
            const displayName = user.name || user.username
            const initials = displayName.slice(0, 2).toUpperCase()

            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => onSelect(user)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-(--radius-button) text-left transition-colors hover:bg-(--bg-hover)"
              >
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={displayName}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-(--border-subtle)"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-(--border-strong)"
                    style={{ backgroundImage: 'var(--grad-brand)' }}
                  >
                    <span className="text-xs font-bold text-(--bg-primary)">
                      {initials}
                    </span>
                  </div>
                )}

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-(--text-primary) truncate">
                    {displayName}
                  </div>
                  <div className="text-xs text-(--text-muted) truncate">
                    @{user.username}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
