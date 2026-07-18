import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'

export default function ProfileSection() {
  const { t } = useTranslation()
  const { profile, user } = useAuth()

  if (!user) return null

  const fallbackIdentity = user.user_metadata?.full_name || user.email?.split('@')[0] || t('Profile')
  const displayName = profile?.name || profile?.username || fallbackIdentity
  const username = profile?.username || null
  const profileAvatarUrl = profile?.photo_url ?? null
  const providerAvatarUrl = typeof user.user_metadata?.avatar_url === 'string'
    ? user.user_metadata.avatar_url
    : null

  return (
    <Surface
      padding="none"
      className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
    >
      <Link
        to="/app/profile/edit"
        className="group flex min-h-[7.25rem] items-center gap-4 px-4 py-4 transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none sm:px-5"
        aria-label={t('Edit profile')}
      >
        <Avatar
          src={profileAvatarUrl}
          ownerId={profile?.id ?? user.id}
          providerSrc={providerAvatarUrl}
          allowAuthProviderImage
          alt={t('Profile avatar')}
          name={displayName}
          size="xl"
          className="size-[4.5rem] border-(--mc-color-accent) bg-(--mc-color-canvas) text-lg text-(--mc-color-text)"
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold text-(--mc-color-text)">
            {displayName}
          </span>
          {username && (
            <span className="mt-0.5 block truncate text-sm text-(--mc-color-text-muted)">
              @{username}
            </span>
          )}
        </span>

        <span className="hidden shrink-0 text-sm font-semibold text-(--mc-color-accent) min-[360px]:inline">
          {t('Edit profile')}
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-(--mc-color-text-muted) transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Link>
    </Surface>
  )
}
