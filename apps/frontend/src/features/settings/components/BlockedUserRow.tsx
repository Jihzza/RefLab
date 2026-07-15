import { useTranslation } from 'react-i18next'
import { Avatar, Button } from '@/components/ui'

interface BlockedUserRowProps {
  username: string
  name: string | null
  photoUrl: string | null
  onUnblock: () => void
  loading?: boolean
}

export default function BlockedUserRow({
  username,
  name,
  photoUrl,
  onUnblock,
  loading = false,
}: BlockedUserRowProps) {
  const { t } = useTranslation()
  const displayName = name || username

  return (
    <div className="flex min-h-16 items-center gap-3 px-3 py-3 sm:px-4">
      <Avatar
        src={photoUrl}
        alt={displayName}
        name={displayName}
        size="md"
      />

      <div className="min-w-0 flex-1">
        {name && (
          <p className="truncate text-sm font-medium text-(--mc-color-text)">{name}</p>
        )}
        <p className="truncate text-xs text-(--mc-color-text-muted)">@{username}</p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={onUnblock}
        loading={loading}
        loadingText={t('Unblocking...')}
        aria-label={`${t('Unblock')} @${username}`}
      >
        {t('Unblock')}
      </Button>
    </div>
  )
}
