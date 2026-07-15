import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Surface } from '@/components/ui'
import type { SearchedUser } from '../types'

interface Props {
  user: SearchedUser
  onSelect?: (user: SearchedUser) => void
}

export default function UserListItem({ user, onSelect }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const displayName = user.name?.trim() || user.username

  const openProfile = () => {
    onSelect?.(user)
    navigate(`/app/profile/${encodeURIComponent(user.username)}`)
  }

  return (
    <Surface
      padding="none"
      className="flex min-h-[72px] items-center gap-2 overflow-hidden border-(--mc-color-border-strong) px-3 shadow-none transition-colors hover:bg-(--mc-color-surface-hover) sm:px-4"
    >
      <button
        type="button"
        onClick={openProfile}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-(--mc-radius-button) py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)"
        aria-label={t('View profile of {{name}}', { name: displayName })}
      >
        <Avatar src={user.photo_url} name={displayName} alt={displayName} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-(--mc-color-text)">
            {user.name ?? '—'}
          </span>
          <span className="mt-0.5 block truncate text-xs text-(--mc-color-text-muted)">
            @{user.username}
          </span>
        </span>
      </button>

      {user.is_following ? (
        <Badge variant="neutral" size="sm">{t('People I follow')}</Badge>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={openProfile}
          trailingIcon={<ChevronRight className="size-3.5" />}
        >
          {t('View')}
        </Button>
      )}
    </Surface>
  )
}
