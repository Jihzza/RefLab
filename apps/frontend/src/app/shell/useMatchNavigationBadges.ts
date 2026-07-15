import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'
import { getTotalUnreadCount } from '@/features/messages/api/messagesApi'
import { MESSAGES_UNREAD_CHANGED_EVENT } from '@/features/messages/types'
import { supabase } from '@/lib/supabaseClient'
import type { MatchNavigationBadges } from './navigation'

const REALTIME_REFRESH_DELAY_MS = 120

/**
 * Loads shell-level badges once so every responsive navigation surface can
 * receive the same snapshot without making duplicate requests.
 */
export function useMatchNavigationBadges(): MatchNavigationBadges {
  const { user } = useAuth()
  const location = useLocation()
  const userId = user?.id ?? null
  const [messageBadge, setMessageBadge] = useState<{
    ownerId: string | null
    count: number
  }>({ ownerId: null, count: 0 })
  const requestSerialRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    let refreshTimer: number | null = null

    if (!userId) {
      return () => {
        cancelled = true
      }
    }

    const refreshBadge = async () => {
      const requestSerial = ++requestSerialRef.current
      const { data, error } = await getTotalUnreadCount(userId)
      if (cancelled || requestSerial !== requestSerialRef.current) return

      if (error) {
        console.error(
          `Failed to load the Match Control message badge for ${location.pathname}:`,
          error,
        )
        return
      }

      setMessageBadge({
        ownerId: userId,
        count: data,
      })
    }

    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null
        void refreshBadge()
      }, REALTIME_REFRESH_DELAY_MS)
    }

    void refreshBadge()

    const channel = supabase
      .channel(`match-navigation-badges:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        scheduleRefresh,
      )
      .subscribe()

    window.addEventListener(MESSAGES_UNREAD_CHANGED_EVENT, scheduleRefresh)

    return () => {
      cancelled = true
      requestSerialRef.current += 1
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      window.removeEventListener(MESSAGES_UNREAD_CHANGED_EVENT, scheduleRefresh)
      void supabase.removeChannel(channel)
    }
  }, [location.pathname, userId])

  return {
    messages:
      userId && messageBadge.ownerId === userId ? messageBadge.count : 0,
  }
}
