import { Bell, BellOff } from 'lucide-react'
import Button from '@/components/ui/Button'
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

  const unreadCount = notifications.filter((n) => isVisuallyUnread(n.id)).length

  return (
    <div className="max-w-2xl mx-auto w-full px-4 pt-5 pb-24">
      {/* Page header */}
      <header className="flex items-center gap-3 mb-5">
        <span
          className="flex-shrink-0 w-10 h-10 rounded-(--radius-button) bg-(--bg-surface-2) border border-(--border-subtle) flex items-center justify-center"
          aria-hidden="true"
        >
          <Bell className="w-5 h-5 text-(--brand-yellow)" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-(--text-primary) leading-tight">
            {t('Notifications')}
          </h1>
          {!loading && !error && unreadCount > 0 && (
            <p className="text-xs text-(--text-muted) mt-0.5 numeral">
              {t('{{count}} unread', { count: unreadCount })}
            </p>
          )}
        </div>
      </header>

      {/* Loading skeleton */}
      {loading && (
        <div className="card-console overflow-hidden divide-y divide-(--border-subtle)">
          {Array.from({ length: 6 }).map((_, i) => (
            <NotificationBannerSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="card-console flex flex-col items-center text-center px-4 py-12">
          <div className="w-14 h-14 rounded-full bg-(--error)/10 border border-(--error)/20 flex items-center justify-center mb-4">
            <BellOff className="w-7 h-7 text-(--error)" aria-hidden="true" />
          </div>
          <p className="text-(--text-secondary) text-sm mb-4">{t(error)}</p>
          <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
            {t('Try Again')}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && notifications.length === 0 && (
        <div className="card-console flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="w-16 h-16 rounded-full bg-(--bg-surface-2) flex items-center justify-center mb-4 border border-(--border-subtle)">
            <Bell className="w-8 h-8 text-(--text-muted)" aria-hidden="true" />
          </div>
          <p className="text-(--text-primary) text-sm font-semibold">
            {t('No notifications yet')}
          </p>
          <p className="text-(--text-muted) text-xs mt-1.5 max-w-xs">
            {t("When someone interacts with your content, you'll see it here.")}
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && !error && notifications.length > 0 && (
        <div
          className="card-console overflow-hidden divide-y divide-(--border-subtle)"
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
