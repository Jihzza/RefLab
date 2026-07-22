import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getUnreadCount } from '../api/notificationsApi'
import { useTranslation } from 'react-i18next'

/**
 * NotificationBell - Header bell icon with unread count badge.
 *
 * Shows badge with count 1-9 or "9+" when count exceeds 9.
 * Re-fetches count on route changes so the badge clears after
 * visiting the notifications page (which marks all as read).
 */
export default function NotificationBell() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  // Re-fetch unread count when user or route changes
  useEffect(() => {
    if (!user?.id) return

    getUnreadCount(user.id).then(({ count }) => {
      setUnreadCount(count)
    })
  }, [user?.id, location.pathname])

  const handleClick = () => {
    navigate('/app/notifications')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mc-focus-ring relative inline-flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-button) text-(--mc-color-text-muted) transition-colors hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
      aria-label={
        unreadCount > 0
          ? `${t('Notifications')} (${unreadCount})`
          : t('Notifications')
      }
    >
      <Bell className="size-5" aria-hidden="true" />

      {unreadCount > 0 && (
        <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--mc-color-danger) px-1 text-[9px] font-bold leading-none text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
