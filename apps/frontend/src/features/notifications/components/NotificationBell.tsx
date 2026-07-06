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
      className="group relative p-2 rounded-full text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
      aria-label={
        unreadCount > 0
          ? `${t('Notifications')} (${unreadCount})`
          : t('Notifications')
      }
    >
      <Bell className="w-6 h-6 transition-colors" />

      {unreadCount > 0 && (
        <span className="numeral absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-(--brand-red) text-white text-[11px] font-bold leading-none rounded-full flex items-center justify-center ring-2 ring-(--bg-surface)">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
