import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'

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
  const { t } = useTranslation()

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
      <Button
        variant="secondary"
        size="sm"
        onClick={onUnblock}
        loading={loading}
        disabled={loading}
        aria-label={`${t('Unblock')} ${username}`}
        className="shrink-0"
      >
        {loading ? t('Unblocking...') : t('Unblock')}
      </Button>
    </div>
  )
}
