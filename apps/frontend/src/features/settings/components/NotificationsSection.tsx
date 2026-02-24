import { Bell } from 'lucide-react'
import SettingsSection from './SettingsSection'
import SettingsToggle from './SettingsToggle'
import type { InAppNotificationType, NotificationPreferences } from '../types'
import { useTranslation } from 'react-i18next'

interface NotificationsSectionProps {
  preferences: NotificationPreferences
  onToggle: (type: InAppNotificationType) => void
  loading: boolean
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
    <div className="px-4 pt-3 pb-1">
      <span className="text-xs font-medium uppercase tracking-wide text-(--text-muted)">
        {children}
      </span>
    </div>
  )
}

export default function NotificationsSection({
  preferences,
  onToggle,
  loading,
}: NotificationsSectionProps) {
  const { t } = useTranslation()

  return (
    <SettingsSection title={t('Notifications')} icon={<Bell className="w-4.5 h-4.5" />}>
      {/* In-app notifications */}
      <div>
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

      <div>
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

      <div>
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

      <div>
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
