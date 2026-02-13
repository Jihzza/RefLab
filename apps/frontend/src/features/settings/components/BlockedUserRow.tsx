interface BlockedUserRowProps {
  username: string
  name: string | null
  photoUrl: string | null
  onUnblock: () => void
  loading?: boolean
}

function getInitials(name: string | null, username: string): string {
  const source = (name?.trim() || username.trim() || 'U')
  return source.slice(0, 2).toUpperCase()
}

export default function BlockedUserRow({
  username,
  name,
  photoUrl,
  onUnblock,
  loading = false,
}: BlockedUserRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full border border-(--border-subtle) bg-(--bg-surface-2) flex items-center justify-center overflow-hidden shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${username}'s avatar`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-(--text-primary)">
            {getInitials(name, username)}
          </span>
        )}
      </div>

      {/* Name & username */}
      <div className="flex-1 min-w-0">
        {name && (
          <p className="text-sm text-(--text-primary) truncate">{name}</p>
        )}
        <p className="text-xs text-(--text-muted) truncate">@{username}</p>
      </div>

      {/* Unblock button */}
      <button
        type="button"
        onClick={onUnblock}
        disabled={loading}
        className="text-xs font-medium px-3 py-1.5 rounded-(--radius-button)
          border border-(--border-subtle) text-(--text-secondary)
          hover:bg-(--bg-hover) transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Unblock ${username}`}
      >
        {loading ? 'Unblocking...' : 'Unblock'}
      </button>
    </div>
  )
}
