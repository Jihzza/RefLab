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
  const {
    blockedUsers,
    loading: blockedLoading,
    error: blockedError,
    unblocking,
    unblock,
  } = useBlockedUsers()

  return (
    <SettingsSection title={t('Privacy & Safety')} icon={<ShieldCheck className="size-5" />}>
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
      <div className="px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center gap-2">
          <UserX className="size-4 text-(--mc-color-text-muted)" aria-hidden="true" />
          <span className="text-sm font-semibold text-(--mc-color-text)">{t('Blocked Users')}</span>
        </div>

        {blockedLoading && (
          <div className="space-y-2 py-1" aria-label={t('Loading blocked users...')}>
            <div className="h-12 animate-pulse rounded-(--mc-radius-input) bg-(--mc-color-surface-raised)" />
            <div className="h-12 animate-pulse rounded-(--mc-radius-input) bg-(--mc-color-surface-raised)" />
          </div>
        )}

        {!blockedLoading && blockedError && (
          <p className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-3 text-xs text-(--mc-color-danger)" role="alert">
            {blockedError}
          </p>
        )}

        {!blockedLoading && !blockedError && blockedUsers.length === 0 && (
          <p className="rounded-(--mc-radius-input) border border-dashed border-(--mc-color-border-strong) bg-(--mc-color-canvas) px-3 py-4 text-center text-xs text-(--mc-color-text-muted)">
            {t("You haven't blocked anyone.")}
          </p>
        )}

        {!blockedLoading && !blockedError && blockedUsers.length > 0 && (
          <div className="divide-y divide-(--mc-color-border) overflow-hidden rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-surface-raised)">
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
          <p className="mt-2 text-xs leading-5 text-(--mc-color-text-muted)">
            {t('Blocked users cannot see your profile, follow you, message you, or comment on your posts.')}
          </p>
        )}
      </div>
    </SettingsSection>
  )
}
