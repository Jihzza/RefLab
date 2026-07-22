import { AlertTriangle } from 'lucide-react'
import DocumentPage from '@/app/layouts/DocumentPage'
import { useAuth } from '@/features/auth/components/useAuth'
import { useSettings } from '../hooks/useSettings'
import ProfileSection from './ProfileSection'
import AccountSection from './AccountSection'
import NotificationsSection from './NotificationsSection'
import PrivacySection from './PrivacySection'
import LearningSection from './LearningSection'
import LegalSection from './LegalSection'
import { useTranslation } from 'react-i18next'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    settings,
    notificationPreferences,
    loading,
    saving,
    error,
    toggleNotification,
    setMessagingPrivacy,
  } = useSettings()

  // Auth guard
  if (!user) {
    return (
      <DocumentPage ariaLabel={t('Settings')} title={t('Settings')} width="narrow">
        <div className="rounded-(--mc-radius-card) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-5">
          <p className="text-sm text-(--mc-color-danger)">
            {t('You must be signed in to access settings.')}
          </p>
        </div>
      </DocumentPage>
    )
  }

  return (
    <DocumentPage
      ariaLabel={t('Settings')}
      eyebrow="Match Control"
      title={t('Settings')}
      width="wide"
      actions={saving ? (
        <span className="inline-flex items-center gap-2 text-xs text-(--mc-color-text-muted)" role="status">
          <span className="size-3 animate-spin rounded-full border-2 border-(--mc-color-accent) border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
          {t('Saving...')}
        </span>
      ) : undefined}
    >
      {error && (
        <div
          className="mb-5 flex items-start gap-3 rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 p-4 text-sm text-(--mc-color-danger)"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t('Failed to load settings: {{error}}', { error })}</span>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2" aria-label={t('Loading...')}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface)"
            />
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <ProfileSection />
            <AccountSection />
            <LearningSection />
          </div>
          <div className="space-y-4">
            <NotificationsSection
              preferences={notificationPreferences}
              onToggle={toggleNotification}
              loading={loading}
            />
            <PrivacySection
              settings={settings}
              onMessagingPrivacyChange={setMessagingPrivacy}
              loading={loading}
            />
            <LegalSection />
          </div>
        </div>
      )}
    </DocumentPage>
  )
}
