import { useState } from 'react'
import { BookOpen, LockKeyhole, Settings, Trash2, UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Surface } from '@/components/ui'
import AccountSection, { AccountActions } from '@/features/settings/components/AccountSection'
import BlockedUserRow from '@/features/settings/components/BlockedUserRow'
import ConfirmDialog from '@/features/settings/components/ConfirmDialog'
import LegalSection from '@/features/settings/components/LegalSection'
import NotificationsSection from '@/features/settings/components/NotificationsSection'
import ProfileSection from '@/features/settings/components/ProfileSection'
import SettingsRadioGroup from '@/features/settings/components/SettingsRadioGroup'
import SettingsSection from '@/features/settings/components/SettingsSection'
import type {
  BlockedUser,
  InAppNotificationType,
  MessagingPrivacy,
  NotificationPreferences,
} from '@/features/settings/types'
import FixtureAuthProvider from './FixtureAuthProvider'
import FixtureShell from './FixtureShell'

const initialNotificationPreferences: NotificationPreferences = {
  liked_post: true,
  comment_on_post: true,
  reply_to_comment: true,
  mentioned_in_comment: true,
  reposted_post: false,
  new_follower: true,
  new_message: true,
  streak_track: true,
  streak_reminder: true,
  streak_loss: false,
  new_content_available: true,
}

const initialBlockedUsers: BlockedUser[] = [
  {
    id: 'blocked-fixture-user',
    username: 'utilizador.teste',
    name: 'Utilizador de teste',
    photo_url: null,
    blocked_at: '2026-06-18T12:00:00.000Z',
  },
]

export default function SettingsFixture() {
  const { t } = useTranslation()
  const [preferences, setPreferences] = useState(initialNotificationPreferences)

  const toggleNotification = (type: InAppNotificationType) => {
    setPreferences((current) => ({ ...current, [type]: !current[type] }))
  }

  return (
    <FixtureAuthProvider>
      <FixtureShell title="Definições">
        <div className="mx-auto w-full max-w-[var(--mc-content-narrow)] px-3 py-4 pb-24 sm:px-6 sm:py-6 md:pb-8">
          <header className="mb-5 flex min-h-16 items-center gap-3 px-1 pt-1 sm:mb-6">
            <Settings className="size-9 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
            <h2 className="min-w-0 flex-1 text-[2rem] font-extrabold leading-tight tracking-[-0.035em] text-(--mc-color-text)">
              {t('Settings')}
            </h2>
          </header>

          <div className="space-y-4 pb-4">
            <ProfileSection />
            <AccountSection />
            <Surface
              padding="none"
              className="divide-y divide-(--mc-color-border) overflow-hidden border-(--mc-color-border-strong) shadow-none"
            >
              <NotificationsSection
                preferences={preferences}
                onToggle={toggleNotification}
                loading={false}
              />
              <FixturePrivacySection />
              <FixtureLearningSection />
              <LegalSection />
            </Surface>
            <AccountActions />
          </div>
        </div>
      </FixtureShell>
    </FixtureAuthProvider>
  )
}

function FixturePrivacySection() {
  const { t } = useTranslation()
  const [privacy, setPrivacy] = useState<MessagingPrivacy>('everyone')
  const [blockedUsers, setBlockedUsers] = useState(initialBlockedUsers)

  const options: { value: MessagingPrivacy; label: string; description: string }[] = [
    { value: 'everyone', label: t('Everyone'), description: t('Anyone can send you messages') },
    { value: 'following', label: t('People I follow'), description: t('Only users you follow can message you') },
    { value: 'mutual', label: t('Mutual followers'), description: t('Only users who follow each other can message') },
    { value: 'nobody', label: t('Nobody'), description: t('Disable direct messages entirely') },
  ]

  return (
    <SettingsSection
      title={t('Privacy & Safety')}
      description={`${t('Messages')} · ${t(options.find((option) => option.value === privacy)?.label ?? 'Everyone')}`}
      icon={<LockKeyhole className="size-7" />}
      grouped
    >
      <SettingsRadioGroup
        label={t('Who can message me')}
        options={options}
        value={privacy}
        onChange={setPrivacy}
      />

      <div className="px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center gap-2">
          <UserX className="size-4.5 text-(--mc-color-accent)" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-(--mc-color-text-secondary)">
            {t('Blocked Users')}
          </h3>
        </div>

        {blockedUsers.length > 0 ? (
          <div className="divide-y divide-(--mc-color-border) overflow-hidden rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas)">
            {blockedUsers.map((blockedUser) => (
              <BlockedUserRow
                key={blockedUser.id}
                userId={blockedUser.id}
                username={blockedUser.username}
                name={blockedUser.name}
                photoUrl={blockedUser.photo_url}
                onUnblock={() => setBlockedUsers((current) => current.filter((item) => item.id !== blockedUser.id))}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-(--mc-radius-input) border border-dashed border-(--mc-color-border) bg-(--mc-color-canvas) px-4 py-5 text-center">
            <p className="text-sm text-(--mc-color-text-muted)">
              {t("You haven't blocked anyone.")}
            </p>
          </div>
        )}
      </div>
    </SettingsSection>
  )
}

function FixtureLearningSection() {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cleared, setCleared] = useState(false)

  return (
    <>
      <SettingsSection
        title={t('Learning')}
        description={t('Clear Learning History')}
        icon={<BookOpen className="size-7" />}
        grouped
      >
        <div className="px-4 py-4 sm:px-5">
          <p className="text-sm leading-6 text-(--mc-color-text-muted)">
            {t('Clear your test attempts and answers, plus streak-related notifications. This cannot be undone.')}
          </p>
          <Button
            variant="danger"
            leadingIcon={<Trash2 className="size-4" />}
            onClick={() => setDialogOpen(true)}
            className="mt-4"
          >
            {t('Clear Learning History')}
          </Button>
          {cleared && (
            <p className="mt-3 text-sm text-(--mc-color-success)" role="status">
              {t('Learning history cleared successfully.')}
            </p>
          )}
        </div>
      </SettingsSection>

      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={() => {
          setDialogOpen(false)
          setCleared(true)
        }}
        title={t('Clear Learning History')}
        description={t('This will permanently delete all your test attempts and answers, and remove streak-related notifications. This action cannot be undone.')}
        confirmLabel={t('Clear History')}
        variant="warning"
      />
    </>
  )
}
