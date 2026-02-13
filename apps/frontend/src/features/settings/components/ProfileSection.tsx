import { Link } from 'react-router-dom'
import { User, ChevronRight } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import SettingsSection from './SettingsSection'

function getInitials(name: string | null, username: string): string {
  const source = (name?.trim() || username.trim() || 'U')
  return source.slice(0, 2).toUpperCase()
}

export default function ProfileSection() {
  const { profile } = useAuth()

  if (!profile) return null

  const displayAvatar = profile.photo_url
  const displayName = profile.name || profile.username
  const initials = getInitials(profile.name, profile.username)

  return (
    <SettingsSection title="Profile" icon={<User className="w-4.5 h-4.5" />}>
      <Link
        to="/app/profile/edit"
        className="flex items-center gap-3 px-4 py-4 hover:bg-(--bg-hover) transition-colors"
        aria-label="Edit profile"
      >
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full border border-(--border-subtle) bg-(--bg-surface-2) flex items-center justify-center overflow-hidden shrink-0">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt="Profile avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-semibold text-(--text-primary)">
              {initials}
            </span>
          )}
        </div>

        {/* Name & username */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-(--text-primary) truncate">
            {displayName}
          </p>
          <p className="text-xs text-(--text-muted) truncate">@{profile.username}</p>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4.5 h-4.5 text-(--text-muted) shrink-0" />
      </Link>
    </SettingsSection>
  )
}
