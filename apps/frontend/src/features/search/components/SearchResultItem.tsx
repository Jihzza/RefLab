import { ChevronRight, X } from 'lucide-react'
import type { SearchHistoryEntry } from '../types'
import { useTranslation } from 'react-i18next'

interface SearchResultItemProps {
  user: SearchHistoryEntry
  onClick: () => void
  /** When provided, renders an X button to remove the item (used in history). */
  onRemove?: () => void
}

/**
 * A single user row shared by both live search results and search history.
 * Rendered as a clean card: avatar (photo or initials fallback), display name,
 * @username, and a trailing chevron / remove affordance.
 */
export default function SearchResultItem({
  user,
  onClick,
  onRemove,
}: SearchResultItemProps) {
  const { t } = useTranslation()
  const displayName = user.name || user.username
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="group flex items-center gap-3 rounded-(--radius-card) px-3 py-2.5 border border-transparent hover:border-(--border-subtle) hover:bg-(--bg-surface) transition-colors">
      {/* Clickable area: avatar + user info */}
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
        aria-label={t('View profile of {{name}}', { name: displayName })}
      >
        {/* Avatar */}
        {user.photo_url ? (
          <img
            src={user.photo_url}
            alt=""
            className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-1 ring-(--border-subtle)"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-(--border-subtle)"
            style={{ backgroundImage: 'var(--grad-brand)' }}
          >
            <span className="text-sm font-bold text-(--bg-primary)">
              {initials}
            </span>
          </div>
        )}

        {/* Name + username */}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-(--text-primary) truncate">
            {displayName}
          </p>
          <p className="text-xs text-(--text-muted) truncate">
            @{user.username}
          </p>
        </div>
      </button>

      {/* Trailing: remove (history) or chevron (results) */}
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-surface-2) hover:text-(--text-primary) transition-colors flex-shrink-0 cursor-pointer"
          aria-label={t('Remove {{name}} from search history', { name: displayName })}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      ) : (
        <ChevronRight
          className="w-4 h-4 text-(--text-faint) flex-shrink-0 transition-colors group-hover:text-(--brand-yellow)"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
