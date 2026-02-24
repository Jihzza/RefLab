import { ShieldCheck, UserX } from 'lucide-react'
import SettingsSection from './SettingsSection'
import SettingsRadioGroup from './SettingsRadioGroup'
import BlockedUserRow from './BlockedUserRow'
import { useBlockedUsers } from '../hooks/useBlockedUsers'
import type { MessagingPrivacy, UserSettings } from '../types'
import { useTranslation } from 'react-i18next'

interface PrivacySectionProps {
  settings: UserSettings
  onMessagingPrivacyChange: (value: MessagingPrivacy) => void
  loading: boolean
}

const MESSAGING_OPTIONS: { value: MessagingPrivacy; label: string; description: string }[] = [
  { value: 'everyone', label: 'Everyone', description: 'Anyone can send you messages' },
  { value: 'following', label: 'People I follow', description: 'Only users you follow can message you' },
  { value: 'mutual', label: 'Mutual followers', description: 'Only users who follow each other can message' },
  { value: 'nobody', label: 'Nobody', description: 'Disable direct messages entirely' },
]

export default function PrivacySection({
  settings,
  onMessagingPrivacyChange,
  loading,
}: PrivacySectionProps) {
  const { t } = useTranslation()
  const { blockedUsers, loading: blockedLoading, unblocking, unblock } = useBlockedUsers()

  return (
    <SettingsSection title={t('Privacy & Safety')} icon={<ShieldCheck className="w-4.5 h-4.5" />}>
      {/* Who can message me */}
      <SettingsRadioGroup
        label={t('Who can message me')}
        options={MESSAGING_OPTIONS.map((option) => ({
          ...option,
          label: t(option.label),
          description: t(option.description),
        }))}
        value={settings.messaging_privacy}
        onChange={onMessagingPrivacyChange}
        disabled={loading}
      />

      {/* Blocked users */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <UserX className="w-4 h-4 text-(--text-muted)" />
          <span className="text-sm font-medium text-(--text-secondary)">{t('Blocked Users')}</span>
        </div>

        {blockedLoading && (
          <p className="text-xs text-(--text-muted) py-2">{t('Loading blocked users...')}</p>
        )}

        {!blockedLoading && blockedUsers.length === 0 && (
          <p className="text-xs text-(--text-muted) py-2">
            {t("You haven't blocked anyone.")}
          </p>
        )}

        {!blockedLoading && blockedUsers.length > 0 && (
          <div className="rounded-(--radius-input) border border-(--border-subtle) overflow-hidden divide-y divide-(--border-subtle)">
            {blockedUsers.map((blockedUser) => (
              <BlockedUserRow
                key={blockedUser.id}
                username={blockedUser.username}
                name={blockedUser.name}
                photoUrl={blockedUser.photo_url}
                onUnblock={() => unblock(blockedUser.id)}
                loading={unblocking === blockedUser.id}
              />
            ))}
          </div>
        )}

        {!blockedLoading && blockedUsers.length > 0 && (
          <p className="text-xs text-(--text-muted) mt-2">
            {t('Blocked users cannot see your profile, follow you, message you, or comment on your posts.')}
          </p>
        )}
      </div>
    </SettingsSection>
  )
}
