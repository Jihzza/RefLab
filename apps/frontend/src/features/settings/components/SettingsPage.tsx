import { AlertTriangle, ChevronRight, RefreshCw, Settings, ShieldAlert, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DocumentPage from '@/app/layouts/DocumentPage'
import { Badge, Button, EmptyState, IconButton, Skeleton, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { useSettings } from '../hooks/useSettings'
import AccountSection, { AccountActions } from './AccountSection'
import LearningSection from './LearningSection'
import LegalSection from './LegalSection'
import NotificationsSection from './NotificationsSection'
import PrivacySection from './PrivacySection'
import ProfileSection from './ProfileSection'

function SettingsLoadingState() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4" role="status" aria-label={t('Loading...')}>
      <Skeleton variant="rectangular" height="7.25rem" />
      <Skeleton variant="rectangular" height="13rem" />
      <Skeleton variant="rectangular" height="4.75rem" />
      <Skeleton variant="rectangular" height="4.75rem" />
      <Skeleton variant="rectangular" height="4.75rem" />
      <span className="sr-only">{t('Loading...')}</span>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    settings,
    notificationPreferences,
    loading,
    hasLoaded,
    loadError,
    saveError,
    saveErrorScope,
    saving,
    notificationSaving,
    privacySaving,
    toggleNotification,
    setMessagingPrivacy,
    retry,
    clearSaveError,
  } = useSettings()

  return (
    <DocumentPage ariaLabel={t('Settings')} width="narrow" spacing="compact">
      <header className="mb-5 flex min-h-16 items-center gap-3 px-1 pt-1 sm:mb-6">
        <Settings className="size-9 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 text-[2rem] font-extrabold leading-tight tracking-[-0.035em] text-(--mc-color-text)">
          {t('Settings')}
        </h2>
        {saving && (
          <Badge variant="accent" dot role="status" className="shrink-0">
            {t('Saving...')}
          </Badge>
        )}
      </header>

      {!user && (
        <Surface padding="none" className="overflow-hidden border-(--mc-color-danger)/35 shadow-none">
          <EmptyState
            icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
            title={t('Settings')}
            description={t('You must be signed in to access settings.')}
          />
        </Surface>
      )}

      {user && loading && <SettingsLoadingState />}

      {user && !loading && loadError && !hasLoaded && (
        <Surface padding="none" className="overflow-hidden border-(--mc-color-danger)/35 shadow-none">
          <EmptyState
            icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
            title={t('Something went wrong. Please try again.')}
            description={t('Failed to load settings: {{error}}', { error: loadError })}
            action={(
              <Button
                variant="secondary"
                leadingIcon={<RefreshCw className="size-4" />}
                onClick={retry}
              >
                {t('Try Again')}
              </Button>
            )}
          />
        </Surface>
      )}

      {user && !loading && hasLoaded && (
        <div className="space-y-4 pb-4">
          {saveError && (
            <div
              className="flex items-start gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/8 px-3.5 py-3 text-sm text-(--mc-color-danger)"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 break-words">
                {t('Failed to save settings: {{error}}', { error: saveError })}
              </span>
              <IconButton
                label={t('Close')}
                size="sm"
                variant="ghost"
                onClick={clearSaveError}
                className="-m-1.5 text-(--mc-color-danger) hover:text-(--mc-color-danger)"
              >
                <X className="size-4" />
              </IconButton>
            </div>
          )}

          <ProfileSection />
          <AccountSection />
          <Surface
            padding="none"
            className="divide-y divide-(--mc-color-border) overflow-hidden border-(--mc-color-border-strong) shadow-none"
          >
            <NotificationsSection
              preferences={notificationPreferences}
              onToggle={toggleNotification}
              loading={loading}
              saving={notificationSaving}
              hasError={saveErrorScope === 'notifications'}
            />
            <PrivacySection
              settings={settings}
              onMessagingPrivacyChange={(value) => void setMessagingPrivacy(value)}
              loading={loading}
              saving={privacySaving}
              hasSaveError={saveErrorScope === 'privacy'}
            />
            <LearningSection />
            <LegalSection />
          </Surface>
          {user.app_metadata?.role === 'admin' && (
            <Surface padding="none" className="overflow-hidden border-(--mc-color-accent)/35 shadow-none">
              <Link
                to="/admin/moderation"
                className="mc-focus-ring group flex min-h-[4.75rem] items-center gap-3 px-4 py-3.5 text-left hover:bg-(--mc-color-surface-hover) sm:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center text-(--mc-color-accent)" aria-hidden="true">
                  <ShieldAlert className="size-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-(--mc-color-text)">
                    {t('Content moderation')}
                  </span>
                  <span className="mt-0.5 block text-xs text-(--mc-color-text-secondary)">
                    {t('Open the private report review queue.')}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-(--mc-color-text-muted) transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </Link>
            </Surface>
          )}
          <AccountActions />
        </div>
      )}
    </DocumentPage>
  )
}
