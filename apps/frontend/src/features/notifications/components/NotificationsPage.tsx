import { Bell } from 'lucide-react'
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
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-(--text-primary)">
          {t('Notifications')}
        </h1>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="divide-y divide-(--border-subtle)">
          {Array.from({ length: 6 }).map((_, i) => (
            <NotificationBannerSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="px-4 py-8 text-center">
          <p className="text-(--text-muted) text-sm">{t(error)}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && notifications.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="w-16 h-16 rounded-full bg-(--bg-surface-2) flex items-center justify-center mb-4 border border-(--border-subtle)">
            <Bell className="w-8 h-8 text-(--text-muted)" aria-hidden="true" />
          </div>
          <p className="text-(--text-muted) text-sm text-center">
            {t('No notifications yet')}
          </p>
          <p className="text-(--text-muted) text-xs text-center mt-1">
            {t("When someone interacts with your content, you'll see it here.")}
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && !error && notifications.length > 0 && (
        <div
          className="divide-y divide-(--border-subtle) pb-4"
          role="list"
          aria-label={t('Notifications list')}
        >
          {notifications.map((notification) => (
            <NotificationBanner
              key={notification.id}
              notification={notification}
              isUnread={isVisuallyUnread(notification.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
