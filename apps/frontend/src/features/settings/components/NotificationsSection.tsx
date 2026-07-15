import { AlertTriangle, Bell } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import SettingsSection from './SettingsSection'
import SettingsToggle from './SettingsToggle'
import type { InAppNotificationType, NotificationPreferences } from '../types'
import { useTranslation } from 'react-i18next'

interface NotificationsSectionProps {
  preferences: NotificationPreferences
  onToggle: (type: InAppNotificationType) => void
  loading: boolean
  saving?: boolean
  hasError?: boolean
}

// Notification toggle groups for organized UI
const ENGAGEMENT_TOGGLES: { key: InAppNotificationType; label: string }[] = [
  { key: 'liked_post', label: 'Post liked' },
  { key: 'comment_on_post', label: 'Comment on my post' },
  { key: 'reply_to_comment', label: 'Reply to my comment' },
  { key: 'mentioned_in_comment', label: 'Mention in comment' },
  { key: 'reposted_post', label: 'Repost of my post' },
]

const SOCIAL_TOGGLES: { key: InAppNotificationType; label: string }[] = [
  { key: 'new_follower', label: 'New follower' },
  { key: 'new_message', label: 'New message' },
]

const STREAK_TOGGLES: { key: InAppNotificationType; label: string }[] = [
  { key: 'streak_track', label: 'Streak track', },
  { key: 'streak_reminder', label: 'Streak reminder', },
  { key: 'streak_loss', label: 'Streak loss', },
]

const CONTENT_TOGGLES: { key: InAppNotificationType; label: string }[] = [
  { key: 'new_content_available', label: 'New content available' },
]

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="bg-(--mc-color-canvas)/55 px-4 py-2.5 sm:px-5">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-(--mc-color-text-muted)">
        {children}
      </span>
    </div>
  )
}

export default function NotificationsSection({
  preferences,
  onToggle,
  loading,
  saving = false,
  hasError = false,
}: NotificationsSectionProps) {
  const { t } = useTranslation()

  return (
    <SettingsSection
      title={t('Notifications')}
      description={`${t('Engagement')} · ${t('Social')} · ${t('Streaks')} · ${t('Content')}`}
      icon={<Bell className="size-7" />}
      grouped
      status={hasError ? (
        <Badge
          variant="danger"
          size="sm"
          aria-label={t('Something went wrong. Please try again.')}
        >
          <AlertTriangle className="size-3.5" aria-hidden="true" />
        </Badge>
      ) : saving ? (
        <Badge variant="accent" size="sm" dot role="status">
          {t('Saving...')}
        </Badge>
      ) : undefined}
    >
      {/* In-app notifications */}
      <div className="divide-y divide-(--mc-color-border)">
        <GroupLabel>{t('Engagement')}</GroupLabel>
        {ENGAGEMENT_TOGGLES.map((item) => (
          <SettingsToggle
            key={item.key}
            label={t(item.label)}
            checked={preferences[item.key]}
            onChange={() => onToggle(item.key)}
            disabled={loading}
          />
        ))}
      </div>

      <div className="divide-y divide-(--mc-color-border)">
        <GroupLabel>{t('Social')}</GroupLabel>
        {SOCIAL_TOGGLES.map((item) => (
          <SettingsToggle
            key={item.key}
            label={t(item.label)}
            checked={preferences[item.key]}
            onChange={() => onToggle(item.key)}
            disabled={loading}
          />
        ))}
      </div>

      <div className="divide-y divide-(--mc-color-border)">
        <GroupLabel>{t('Streaks')}</GroupLabel>
        {STREAK_TOGGLES.map((item) => (
          <SettingsToggle
            key={item.key}
            label={t(item.label)}
            checked={preferences[item.key]}
            onChange={() => onToggle(item.key)}
            disabled={loading}
          />
        ))}
      </div>

      <div className="divide-y divide-(--mc-color-border)">
        <GroupLabel>{t('Content')}</GroupLabel>
        {CONTENT_TOGGLES.map((item) => (
          <SettingsToggle
            key={item.key}
            label={t(item.label)}
            checked={preferences[item.key]}
            onChange={() => onToggle(item.key)}
            disabled={loading}
          />
        ))}
      </div>

    </SettingsSection>
  )
}
