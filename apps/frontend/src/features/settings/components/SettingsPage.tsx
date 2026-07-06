import { Settings } from 'lucide-react'
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
    error,
    toggleNotification,
    setMessagingPrivacy,
  } = useSettings()

  // Auth guard
  if (!user) {
    return (
      <section className="p-4 pb-20">
        <div className="card-console p-6">
          <h1 className="text-xl font-bold text-(--text-primary)">{t('Settings')}</h1>
          <p className="mt-2 text-sm text-(--error)">
            {t('You must be signed in to access settings.')}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="p-4 pb-20 animate-fade-up">
      {/* Page header */}
      <div className="flex items-center gap-2.5 mb-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-(--brand-yellow)/12 text-(--brand-yellow)">
          <Settings className="w-5 h-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-(--text-primary) leading-tight">{t('Settings')}</h1>
          <p className="text-xs text-(--text-muted)">{t('Manage your account and preferences')}</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 p-3 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm"
          role="alert"
        >
          {t('Failed to load settings: {{error}}', { error })}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card-console h-24 skeleton"
            />
          ))}
        </div>
      )}

      {/* Settings sections */}
      {!loading && (
        <div className="space-y-4">
          <ProfileSection />

          <AccountSection />

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

          <LearningSection />

          <LegalSection />
        </div>
      )}
    </section>
  )
}
