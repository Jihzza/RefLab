import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getUnreadCount } from '../api/notificationsApi'

/**
 * NotificationBell - Header bell icon with unread count badge.
 *
 * Shows badge with count 1-9 or "9+" when count exceeds 9.
 * Re-fetches count on route changes so the badge clears after
 * visiting the notifications page (which marks all as read).
 */
export default function NotificationBell() {
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
      onClick={handleClick}
      className="relative p-2"
      aria-label={
        unreadCount > 0
          ? `Notifications (${unreadCount} unread)`
          : 'Notifications'
      }
    >
      <Bell className="w-6 h-6 text-(--text-secondary) hover:text-(--text-primary) transition-colors" />

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-(--brand-red) text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}
