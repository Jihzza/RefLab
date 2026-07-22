import { Link } from 'react-router-dom'
import { User, ChevronRight, Pencil } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import SettingsSection from './SettingsSection'
import { useTranslation } from 'react-i18next'

function getInitials(name: string | null, username: string): string {
  const source = (name?.trim() || username.trim() || 'U')
  return source.slice(0, 2).toUpperCase()
}

export default function ProfileSection() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  if (!profile) return null

  const displayAvatar = profile.photo_url
  const displayName = profile.name || profile.username
  const initials = getInitials(profile.name, profile.username)

  return (
    <SettingsSection title={t('Profile')} icon={<User className="size-5" />}>
      <Link
        to="/app/profile/edit"
        className="group flex min-h-20 items-center gap-3 px-4 py-4 transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) sm:px-5"
        aria-label={t('Edit profile')}
      >
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-(--mc-color-accent)/60 bg-(--mc-color-surface-raised) shadow-(--mc-shadow-soft)">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={t('Profile avatar')}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-(--mc-color-text)">
              {initials}
            </span>
          )}
        </div>

        {/* Name & username */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-(--mc-color-text)">
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-xs text-(--mc-color-text-muted)">@{profile.username}</p>
        </div>

        <span className="flex size-10 shrink-0 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface-raised) text-(--mc-color-text-muted) transition-colors group-hover:border-(--mc-color-accent)/40 group-hover:text-(--mc-color-accent)">
          <Pencil className="size-4" aria-hidden="true" />
          <ChevronRight className="sr-only" />
        </span>
      </Link>
    </SettingsSection>
  )
}
