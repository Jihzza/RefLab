import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Badge, IconButton } from '@/components/ui'
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
    <IconButton
      label={
        unreadCount > 0
          ? `${t('Notifications')} (${unreadCount})`
          : t('Notifications')
      }
      variant="ghost"
      size="md"
      onClick={handleClick}
      className="relative"
    >
      <Bell className="size-5" />

      {unreadCount > 0 && (
        <Badge
          variant="danger"
          size="sm"
          className="pointer-events-none absolute -right-0.5 -top-0.5 min-w-5 !border-(--mc-color-canvas) !bg-(--mc-color-danger) px-1 !text-white shadow-sm"
          aria-hidden="true"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </IconButton>
  )
}
