import type { UserSearchResult } from '../types'
import { useTranslation } from 'react-i18next'

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
    <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-xl overflow-hidden">
      {isSearching && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isSearching && results.length === 0 && (
        <div className="px-4 py-3 text-sm text-(--text-muted)">
          {query.trim() ? t('No users found') : t('Type to search')}
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="max-h-72 overflow-y-auto">
          {results.map(user => {
            const displayName = user.name || user.username
            const initials = displayName.slice(0, 2).toUpperCase()

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelect(user)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-(--bg-hover) transition-colors"
              >
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={displayName}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-(--bg-primary)">
                      {initials}
                    </span>
                  </div>
                )}

                <div className="min-w-0">
                  <div className="text-sm font-medium text-(--text-primary) truncate">
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
