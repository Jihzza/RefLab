import { Bell, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DocumentPage from '@/app/layouts/DocumentPage'
import { EmptyState, Surface } from '@/components/ui'
import { useNotifications } from '../hooks/useNotifications'
import NotificationBanner, { NotificationBannerSkeleton } from './NotificationBanner'

export default function NotificationsPage() {
  const { t } = useTranslation()
  const { notifications, loading, error, isVisuallyUnread } = useNotifications()
  const unreadCount = notifications.filter((notification) => isVisuallyUnread(notification.id)).length

  return (
    <DocumentPage
      ariaLabel={t('Notifications')}
      width="narrow"
      eyebrow={t('Match Control')}
      title={t('Notifications')}
      description={t('Updates about your activity, community and RefLab account.')}
      actions={unreadCount > 0 ? (
        <span className="inline-flex min-h-8 items-center gap-2 rounded-(--mc-radius-pill) border border-(--mc-color-accent)/35 bg-(--mc-color-accent)/10 px-3 text-xs font-bold text-(--mc-color-accent)">
          <span className="size-2 rounded-full bg-(--mc-color-accent)" aria-hidden="true" />
          {t('{{count}} new', { count: unreadCount })}
        </span>
      ) : undefined}
    >
      {loading && (
        <div className="space-y-3" role="status" aria-label={t('Loading notifications')}>
          {Array.from({ length: 5 }).map((_, index) => <NotificationBannerSkeleton key={index} />)}
        </div>
      )}

      {error && !loading && (
        <Surface padding="none">
          <EmptyState
            icon={<ShieldCheck className="size-6" />}
            title={t('Unable to load notifications')}
            description={t(error)}
          />
        </Surface>
      )}

      {!loading && !error && notifications.length === 0 && (
        <Surface padding="none">
          <EmptyState
            icon={<Bell className="size-6" />}
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
    </DocumentPage>
  )
}
