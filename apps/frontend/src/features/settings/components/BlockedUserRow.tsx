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
    <div className="flex items-center gap-3 px-3 py-3">
      {/* Avatar */}
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--mc-color-border-strong) bg-(--mc-color-canvas)">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-(--mc-color-text)">
            {getInitials(name, username)}
          </span>
        )}
      </div>

      {/* Name & username */}
      <div className="flex-1 min-w-0">
        {name && (
          <p className="truncate text-sm font-medium text-(--mc-color-text)">{name}</p>
        )}
        <p className="truncate text-xs text-(--mc-color-text-muted)">@{username}</p>
      </div>

      {/* Unblock button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onUnblock}
        disabled={loading}
        loading={loading}
        aria-label={`${t('Unblock')} ${username}`}
      >
        {loading ? t('Unblocking...') : t('Unblock')}
      </Button>
    </div>
  )
}
