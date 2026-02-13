import type { SearchHistoryEntry } from '../types'

interface SearchResultItemProps {
  user: SearchHistoryEntry
  onClick: () => void
  /** When provided, renders an X button to remove the item (used in history). */
  onRemove?: () => void
}

/**
 * A single user row shared by both live search results and search history.
 * Shows avatar (photo or initials fallback), display name, and @username.
 */
export default function SearchResultItem({
  user,
  onClick,
  onRemove,
}: SearchResultItemProps) {
  const displayName = user.name || user.username
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-(--bg-hover) transition-colors">
      {/* Clickable area: avatar + user info */}
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
        aria-label={`View profile of ${displayName}`}
      >
        {/* Avatar */}
        {user.photo_url ? (
          <img
            src={user.photo_url}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-(--bg-primary)">
              {initials}
            </span>
          </div>
        )}

        {/* Name + username */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-(--text-primary) truncate">
            {displayName}
          </p>
          <p className="text-xs text-(--text-muted) truncate">
            @{user.username}
          </p>
        </div>
      </button>

      {/* Remove button (only for history items) */}
      {onRemove && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          className="w-7 h-7 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-surface-2) hover:text-(--text-primary) transition-colors flex-shrink-0 cursor-pointer"
          aria-label={`Remove ${displayName} from search history`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
