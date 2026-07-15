import { Bell, BellOff } from 'lucide-react'
import { EmptyState, Surface } from '@/components/ui'
import { useNotifications } from '../hooks/useNotifications'
import NotificationBanner, {
  NotificationBannerSkeleton,
} from './NotificationBanner'
import { useTranslation } from 'react-i18next'

/**
 * NotificationsPage - Displays all user notifications with read/unread styling.
 *
 * Behavior:
 * - On page entry, all unread notifications are marked as read in the DB
 * - Newly-read notifications keep their "unread" visual styling for the session
 * - On next visit, all notifications appear as read
 *
 * Route: /app/notifications
 */
export default function NotificationsPage() {
  const { t } = useTranslation()
  const { notifications, loading, error, isVisuallyUnread } =
    useNotifications()

  return (
    <section
      aria-label={t('Notifications')}
      className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)"
    >
      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-5 sm:px-6 sm:pt-7">
        <header className="mb-4 sm:mb-5">
          <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-(--mc-color-text) sm:text-3xl">
            {t('Notifications')}
          </h2>
        </header>

        {loading && (
          <div
            className="space-y-3"
            role="status"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="sr-only">{t('Loading...')}</span>
            {Array.from({ length: 6 }).map((_, index) => (
              <NotificationBannerSkeleton key={index} />
            ))}
          </div>
        )}

        {error && !loading && (
          <Surface
            variant="inset"
            className="border-(--mc-color-danger)/35 bg-(--mc-color-danger)/8"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-(--mc-radius-button) bg-(--mc-color-danger)/12 text-(--mc-color-danger)">
                <BellOff className="size-5" aria-hidden="true" />
              </div>
              <p className="pt-2 text-sm leading-5 text-(--mc-color-text-secondary)">
                {t(error)}
              </p>
            </div>
          </Surface>
        )}

        {!loading && !error && notifications.length === 0 && (
          <Surface padding="none" className="overflow-hidden">
            <EmptyState
              icon={<Bell className="size-5" />}
              title={t('No notifications yet')}
              description={t("When someone interacts with your content, you'll see it here.")}
            />
          </Surface>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="space-y-3" aria-label={t('Notifications list')}>
            {notifications.map((notification) => (
              <NotificationBanner
                key={notification.id}
                notification={notification}
                isUnread={isVisuallyUnread(notification.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
