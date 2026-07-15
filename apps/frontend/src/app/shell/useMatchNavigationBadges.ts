import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'
import { getTotalUnreadCount } from '@/features/messages/api/messagesApi'
import type { MatchNavigationBadges } from './navigation'

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

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      return () => {
        cancelled = true
      }
    }

    void getTotalUnreadCount(userId).then(({ data, error }) => {
      if (cancelled) return

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
    })

    return () => {
      cancelled = true
    }
  }, [location.pathname, userId])

  return {
    messages:
      userId && messageBadge.ownerId === userId ? messageBadge.count : 0,
  }
}
