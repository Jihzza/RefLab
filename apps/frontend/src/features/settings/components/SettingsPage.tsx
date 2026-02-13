import { Settings } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import { useSettings } from '../hooks/useSettings'
import ProfileSection from './ProfileSection'
import AccountSection from './AccountSection'
import NotificationsSection from './NotificationsSection'
import PrivacySection from './PrivacySection'
import LearningSection from './LearningSection'
import LegalSection from './LegalSection'

export default function SettingsPage() {
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
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-6">
          <h1 className="text-xl font-semibold text-(--text-primary)">Settings</h1>
          <p className="mt-2 text-sm text-(--error)">
            You must be signed in to access settings.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="p-4 pb-20">
      {/* Page header */}
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-(--text-muted)" />
        <h1 className="text-xl font-semibold text-(--text-primary)">Settings</h1>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 p-3 rounded-(--radius-input) bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm"
          role="alert"
        >
          Failed to load settings: {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) h-24 animate-pulse"
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
