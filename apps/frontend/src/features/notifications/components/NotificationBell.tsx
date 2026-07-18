import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Badge, IconButton } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { getUnreadCount } from '../api/notificationsApi'
import { NOTIFICATIONS_READ_EVENT } from '../types'
import { useTranslation } from 'react-i18next'

/**
 * NotificationBell - Header bell icon with unread count badge.
 *
 * Shows badge with count 1-9 or "9+" when count exceeds 9.
 * Re-fetches on navigation, focus, and owner-filtered Realtime events so
 * every tab/device converges after inserts and read-state updates.
 */
export default function NotificationBell() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const userId = user?.id ?? null
  const [unreadState, setUnreadState] = useState<{
    ownerId: string | null
    count: number
  }>({ ownerId: null, count: 0 })
  const requestGenerationRef = useRef(0)

  const refreshUnread = useCallback(async () => {
    if (!userId) return
    const generation = ++requestGenerationRef.current
    const { count, error } = await getUnreadCount(userId)
    if (requestGenerationRef.current !== generation) return
    if (error) {
      console.error('Failed to load unread notification count:', error)
      return
    }
    setUnreadState({ ownerId: userId, count })
  }, [userId])

  // Re-fetch unread count when user or route changes
  useEffect(() => {
    if (!userId) {
      requestGenerationRef.current += 1
      return
    }

    const refreshTimer = window.setTimeout(() => void refreshUnread(), 0)

    return () => {
      window.clearTimeout(refreshTimer)
      requestGenerationRef.current += 1
    }
  }, [location.pathname, refreshUnread, userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let refreshTimer: number | null = null
    const scheduleRefresh = () => {
      if (cancelled) return
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null
        if (cancelled) return
        void refreshUnread()
      }, 120)
    }
    const refreshWhenReadable = () => {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }

    const channel = supabase
      .channel(`notification-bell:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefresh,
      )
      .subscribe(status => {
        // Cover the snapshot-to-subscription gap, including reconnects.
        if (status === 'SUBSCRIBED' && !cancelled) scheduleRefresh()
      })

    window.addEventListener('focus', refreshWhenReadable)
    document.addEventListener('visibilitychange', refreshWhenReadable)

    return () => {
      cancelled = true
      requestGenerationRef.current += 1
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      window.removeEventListener('focus', refreshWhenReadable)
      document.removeEventListener('visibilitychange', refreshWhenReadable)
      void supabase.removeChannel(channel)
    }
  }, [refreshUnread, userId])

  useEffect(() => {
    const handleNotificationsRead = () => {
      requestGenerationRef.current += 1
      setUnreadState({ ownerId: userId, count: 0 })
    }
    window.addEventListener(NOTIFICATIONS_READ_EVENT, handleNotificationsRead)
    return () => window.removeEventListener(NOTIFICATIONS_READ_EVENT, handleNotificationsRead)
  }, [userId])

  const unreadCount = userId && unreadState.ownerId === userId
    ? unreadState.count
    : 0

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
