import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getActiveNotifications, markAllAsRead } from '../api/notificationsApi'
import { NOTIFICATIONS_READ_EVENT, type EnrichedNotification } from '../types'

/**
 * useNotifications - Fetches notifications and auto-marks them as read.
 *
 * Snapshot pattern:
 * 1. On mount, fetch all active notifications
 * 2. Capture which IDs are unread into a ref (the "snapshot")
 * 3. Call markAllAsRead in the background (fire-and-forget)
 * 4. Expose isVisuallyUnread(id) so banners keep their unread styling
 *    for the current session, even though the DB already has them as read
 * 5. On next page visit, the snapshot is empty (everything is read in DB)
 */
export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadRequest, setReloadRequest] = useState(0)

  // Snapshot of notification IDs that were unread when the page was entered
  const unreadSnapshotRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return
    const activeUserId = userId

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { notifications: data, error: fetchError } =
        await getActiveNotifications(activeUserId)

      if (cancelled) return

      if (fetchError) {
        setError('Failed to load notifications')
        setLoading(false)
        return
      }

      const items = data ?? []
      setNotifications(items)

      // Snapshot: capture which ones are currently unread
      const unreadIds = new Set(
        items.filter((n) => !n.read).map((n) => n.id)
      )
      unreadSnapshotRef.current = unreadIds

      setLoading(false)

      // Keep the entry snapshot, but notify the global badge only after the
      // database confirms the read update.
      if (unreadIds.size > 0) {
        void markAllAsRead(activeUserId)
          .then(({ error: markReadError }) => {
            if (markReadError) {
              console.error('Failed to mark all as read:', markReadError)
              return
            }
            if (!cancelled) window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT))
          })
          .catch((err) => console.error('Failed to mark all as read:', err))
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [reloadRequest, userId])

  const retry = useCallback(() => {
    setReloadRequest(currentRequest => currentRequest + 1)
  }, [])

  // Check if a notification should display as "unread" in this session
  const isVisuallyUnread = useCallback(
    (notificationId: string): boolean => {
      return unreadSnapshotRef.current.has(notificationId)
    },
    []
  )

  return {
    notifications,
    loading,
    error,
    retry,
    isVisuallyUnread,
  }
}
