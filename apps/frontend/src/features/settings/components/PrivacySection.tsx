import { AlertTriangle, LockKeyhole, UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Skeleton } from '@/components/ui'
import BlockedUserRow from './BlockedUserRow'
import SettingsRadioGroup from './SettingsRadioGroup'
import SettingsSection from './SettingsSection'
import { useBlockedUsers } from '../hooks/useBlockedUsers'
import type { MessagingPrivacy, UserSettings } from '../types'

interface PrivacySectionProps {
  settings: UserSettings
  onMessagingPrivacyChange: (value: MessagingPrivacy) => void
  loading: boolean
  saving?: boolean
  hasSaveError?: boolean
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
  saving = false,
  hasSaveError = false,
}: PrivacySectionProps) {
  const { t } = useTranslation()
  const {
    blockedUsers,
    loading: blockedLoading,
    error: blockedError,
    unblockingIds,
    unblock,
    retry,
  } = useBlockedUsers()

  const selectedPrivacy = MESSAGING_OPTIONS.find(
    (option) => option.value === settings.messaging_privacy,
  )

  return (
    <SettingsSection
      title={t('Privacy & Safety')}
      description={`${t('Messages')} · ${t(selectedPrivacy?.label ?? 'Everyone')}`}
      icon={<LockKeyhole className="size-7" />}
      grouped
      status={blockedError || hasSaveError ? (
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
      <SettingsRadioGroup
        label={t('Who can message me')}
        options={MESSAGING_OPTIONS.map((option) => ({
          ...option,
          label: t(option.label),
          description: t(option.description),
        }))}
        value={settings.messaging_privacy}
        onChange={onMessagingPrivacyChange}
        disabled={loading || saving}
      />

      <div className="px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center gap-2">
          <UserX className="size-4.5 text-(--mc-color-accent)" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-(--mc-color-text-secondary)">
            {t('Blocked Users')}
          </h3>
        </div>

        {blockedError && (
          <div
            className="mb-3 flex flex-wrap items-center gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/8 px-3.5 py-3 text-sm text-(--mc-color-danger)"
            role="alert"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words">{blockedError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void retry()}
              disabled={unblockingIds.size > 0}
              className="text-(--mc-color-danger) hover:text-(--mc-color-danger)"
            >
              {t('Try Again')}
            </Button>
          </div>
        )}

        {blockedLoading && (
          <div className="space-y-2" role="status" aria-label={t('Loading blocked users...')}>
            <Skeleton variant="rectangular" height="4rem" />
            <Skeleton variant="rectangular" height="4rem" />
          </div>
        )}

        {!blockedLoading && !blockedError && blockedUsers.length === 0 && unblockingIds.size === 0 && (
          <div className="rounded-(--mc-radius-input) border border-dashed border-(--mc-color-border) bg-(--mc-color-canvas) px-4 py-5 text-center">
            <p className="text-sm text-(--mc-color-text-muted)">
              {t("You haven't blocked anyone.")}
            </p>
          </div>
        )}

        {!blockedLoading && blockedUsers.length > 0 && (
          <div className="divide-y divide-(--mc-color-border) overflow-hidden rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)">
            {blockedUsers.map((blockedUser) => (
              <BlockedUserRow
                key={blockedUser.id}
                username={blockedUser.username}
                name={blockedUser.name}
                photoUrl={blockedUser.photo_url}
                onUnblock={() => void unblock(blockedUser.id)}
                loading={unblockingIds.has(blockedUser.id)}
              />
            ))}
          </div>
        )}

        {unblockingIds.size > 0 && (
          <p className="mt-2 text-xs text-(--mc-color-text-muted)" role="status">
            {t('Unblocking...')}
          </p>
        )}

        {!blockedLoading && blockedUsers.length > 0 && (
          <p className="mt-3 text-xs leading-5 text-(--mc-color-text-muted)">
            {t('Blocked users cannot see your profile, follow you, message you, or comment on your posts.')}
          </p>
        )}
      </div>
    </SettingsSection>
  )
}
