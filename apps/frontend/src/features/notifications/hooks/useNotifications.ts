import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { supabase } from '@/lib/supabaseClient'
import {
  getActiveNotifications,
  getActiveNotificationsByIds,
  markNotificationsAsRead,
  type NotificationCursor,
} from '../api/notificationsApi'
import { NOTIFICATIONS_READ_EVENT, type EnrichedNotification } from '../types'

const PAGE_SIZE = 50
const REALTIME_REFRESH_DELAY_MS = 120
const MAX_FIRST_PAGE_DELTA_RETRIES = 2

function isDocumentReadable() {
  return document.visibilityState === 'visible' && document.hasFocus()
}

function compareNewestFirst(
  left: EnrichedNotification,
  right: EnrichedNotification,
) {
  const timestampOrder = right.created_at.localeCompare(left.created_at)
  return timestampOrder || right.id.localeCompare(left.id)
}

function cursorFrom(items: EnrichedNotification[]): NotificationCursor | null {
  const oldest = items.at(-1)
  return oldest ? { createdAt: oldest.created_at, id: oldest.id } : null
}

function isAtOrNewerThanCursor(
  notification: EnrichedNotification,
  cursor: NotificationCursor,
) {
  if (notification.created_at !== cursor.createdAt) {
    return notification.created_at > cursor.createdAt
  }
  return notification.id >= cursor.id
}

/**
 * Loads a bounded keyset page, applies Realtime rows as deltas, and marks only
 * the exact unread IDs actually displayed. This avoids a full 50-row refetch
 * for every message notification while preserving cross-device convergence.
 */
export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([])
  const [notificationsOwnerId, setNotificationsOwnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [reloadRequest, setReloadRequest] = useState(0)

  const unreadSnapshotRef = useRef<Set<string>>(new Set())
  const snapshotOwnerRef = useRef<string | null>(null)
  const notificationsOwnerRef = useRef<string | null>(null)
  const notificationsRef = useRef<EnrichedNotification[]>([])
  const cursorRef = useRef<NotificationCursor | null>(null)
  const loadMoreRequestRef = useRef(0)
  const deltaRevisionRef = useRef(0)

  const captureAndMarkUnread = useCallback(async (
    activeUserId: string,
    items: EnrichedNotification[],
  ) => {
    if (snapshotOwnerRef.current !== activeUserId) return

    const unreadIds = items
      .filter(notification => !notification.read)
      .map(notification => notification.id)

    if (unreadIds.length === 0) return

    unreadSnapshotRef.current = new Set([
      ...unreadSnapshotRef.current,
      ...unreadIds,
    ])

    if (!isDocumentReadable()) return

    const { error: markReadError } = await markNotificationsAsRead(
      activeUserId,
      unreadIds,
    )
    if (markReadError) {
      console.error('Failed to mark notifications as read:', markReadError)
      return
    }
    if (snapshotOwnerRef.current === activeUserId) {
      window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT))
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      loadMoreRequestRef.current += 1
      notificationsOwnerRef.current = null
      notificationsRef.current = []
      cursorRef.current = null
      deltaRevisionRef.current = 0
      unreadSnapshotRef.current = new Set()
      snapshotOwnerRef.current = null
      return
    }

    const activeUserId = userId
    let cancelled = false

    if (snapshotOwnerRef.current !== activeUserId) {
      snapshotOwnerRef.current = activeUserId
      unreadSnapshotRef.current = new Set()
    }
    if (notificationsOwnerRef.current !== activeUserId) {
      notificationsRef.current = []
      cursorRef.current = null
    }

    async function loadFirstPage(deltaRetry = 0): Promise<void> {
      loadMoreRequestRef.current += 1
      setLoadingMore(false)
      if (notificationsOwnerRef.current !== activeUserId) setLoading(true)
      setError(null)
      setLoadMoreError(null)
      const requestedAtDeltaRevision = deltaRevisionRef.current

      const { notifications: data, error: fetchError } =
        await getActiveNotifications(activeUserId, null, PAGE_SIZE + 1)

      if (cancelled) return

      // A Realtime event scheduled after this SELECT began makes its snapshot
      // unsafe to apply: it could hide a new row or resurrect one that the
      // delta lookup intentionally omitted. Retry from a fresh first page, but
      // keep the loop bounded under a sustained event stream.
      if (requestedAtDeltaRevision !== deltaRevisionRef.current) {
        if (deltaRetry < MAX_FIRST_PAGE_DELTA_RETRIES) {
          await loadFirstPage(deltaRetry + 1)
        } else {
          // Preserve the reconciled in-memory rows and expose a retryable state;
          // never leave a first-load owner mismatch presenting an endless spin.
          if (notificationsOwnerRef.current !== activeUserId) {
            notificationsRef.current = []
            setNotifications([])
            cursorRef.current = null
            setHasMore(false)
          }
          notificationsOwnerRef.current = activeUserId
          setNotificationsOwnerId(activeUserId)
          setLoading(false)
          setError('Notifications changed while loading. Please retry.')
        }
        return
      }

      if (fetchError) {
        // Keep already reconciled rows visible on a transient refresh failure,
        // but never expose rows owned by a previous signed-in account.
        if (notificationsOwnerRef.current !== activeUserId) {
          notificationsRef.current = []
          setNotifications([])
          cursorRef.current = null
          setHasMore(false)
        }
        setNotificationsOwnerId(activeUserId)
        notificationsOwnerRef.current = activeUserId
        setError('Failed to load notifications')
        setLoading(false)
        return
      }

      const fetched = data ?? []
      const page = fetched.slice(0, PAGE_SIZE)
      cursorRef.current = cursorFrom(page)
      notificationsRef.current = page
      setHasMore(fetched.length > PAGE_SIZE)
      setNotifications(page)
      setNotificationsOwnerId(activeUserId)
      notificationsOwnerRef.current = activeUserId
      setLoading(false)
      void captureAndMarkUnread(activeUserId, page)
    }

    void loadFirstPage()

    return () => {
      cancelled = true
    }
  }, [captureAndMarkUnread, reloadRequest, userId])

  useEffect(() => {
    if (!userId) return

    const activeUserId = userId
    const pendingIds = new Set<string>()
    let deltaTimer: number | null = null
    let focusTimer: number | null = null
    let cancelled = false

    const flushDeltas = async () => {
      deltaTimer = null
      const requestedIds = [...pendingIds]
      pendingIds.clear()
      if (requestedIds.length === 0) return

      const { notifications: changedRows, error: deltaError } =
        await getActiveNotificationsByIds(activeUserId, requestedIds)
      if (cancelled || snapshotOwnerRef.current !== activeUserId) return

      if (deltaError) {
        console.error('Failed to reconcile notification updates:', deltaError)
        setReloadRequest(currentRequest => currentRequest + 1)
        return
      }

      const changedById = new Map(
        changedRows.map(notification => [notification.id, notification]),
      )
      const requestedSet = new Set(requestedIds)

      const current = notificationsRef.current
      const loadedIds = new Set(current.map(notification => notification.id))
      const boundary = cursorRef.current
      const visibleChangedRows = [...changedById.values()].filter(notification => (
        loadedIds.has(notification.id)
        || boundary === null
        || isAtOrNewerThanCursor(notification, boundary)
      ))
      const merged = current
        .filter(notification => !requestedSet.has(notification.id))
      merged.push(...visibleChangedRows)
      merged.sort(compareNewestFirst)
      notificationsRef.current = merged
      setNotifications(merged)

      // Realtime never advances the pagination frontier. An unseen UPDATE below
      // the loaded boundary belongs to a later keyset page; admitting it would
      // move the cursor past rows that the user has not fetched yet.
      void captureAndMarkUnread(activeUserId, visibleChangedRows)
    }

    const scheduleDelta = (payload: { new: Record<string, unknown> }) => {
      if (cancelled) return
      const notificationId = payload.new.id
      if (typeof notificationId !== 'string') return
      deltaRevisionRef.current += 1
      pendingIds.add(notificationId)
      if (deltaTimer !== null) window.clearTimeout(deltaTimer)
      deltaTimer = window.setTimeout(() => void flushDeltas(), REALTIME_REFRESH_DELAY_MS)
    }

    const scheduleFocusRefresh = () => {
      if (document.visibilityState !== 'visible') return
      if (focusTimer !== null) window.clearTimeout(focusTimer)
      focusTimer = window.setTimeout(() => {
        focusTimer = null
        setReloadRequest(currentRequest => currentRequest + 1)
      }, REALTIME_REFRESH_DELAY_MS)
    }

    const channel = supabase
      .channel(`notifications-page:${activeUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${activeUserId}`,
        },
        scheduleDelta,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${activeUserId}`,
        },
        scheduleDelta,
      )
      .subscribe(status => {
        // The first SELECT can snapshot before this channel has joined. A
        // catch-up fetch after every successful join/rejoin closes that gap;
        // subsequent Realtime deltas remain protected by deltaRevisionRef.
        if (status === 'SUBSCRIBED' && !cancelled) {
          setReloadRequest(currentRequest => currentRequest + 1)
        }
      })

    window.addEventListener('focus', scheduleFocusRefresh)
    document.addEventListener('visibilitychange', scheduleFocusRefresh)

    return () => {
      cancelled = true
      if (deltaTimer !== null) window.clearTimeout(deltaTimer)
      if (focusTimer !== null) window.clearTimeout(focusTimer)
      window.removeEventListener('focus', scheduleFocusRefresh)
      document.removeEventListener('visibilitychange', scheduleFocusRefresh)
      void supabase.removeChannel(channel)
    }
  }, [captureAndMarkUnread, userId])

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || !cursorRef.current) return

    const activeUserId = userId
    const requestId = ++loadMoreRequestRef.current
    const cursor = cursorRef.current
    setLoadingMore(true)
    setLoadMoreError(null)

    const { notifications: data, error: fetchError } =
      await getActiveNotifications(activeUserId, cursor, PAGE_SIZE + 1)

    if (
      requestId !== loadMoreRequestRef.current
      || snapshotOwnerRef.current !== activeUserId
    ) return

    if (fetchError) {
      setLoadingMore(false)
      setLoadMoreError('Failed to load more notifications')
      return
    }

    const fetched = data ?? []
    const page = fetched.slice(0, PAGE_SIZE)
    const byId = new Map(
      notificationsRef.current.map(notification => [notification.id, notification]),
    )
    for (const notification of page) byId.set(notification.id, notification)
    const merged = [...byId.values()].sort(compareNewestFirst)
    notificationsRef.current = merged
    setNotifications(merged)
    cursorRef.current = cursorFrom(page) ?? cursor
    setHasMore(fetched.length > PAGE_SIZE)
    setLoadingMore(false)
    void captureAndMarkUnread(activeUserId, page)
  }, [captureAndMarkUnread, hasMore, loadingMore, userId])

  const retry = useCallback(() => {
    setReloadRequest(currentRequest => currentRequest + 1)
  }, [])

  const isVisuallyUnread = useCallback(
    (notificationId: string): boolean => {
      return unreadSnapshotRef.current.has(notificationId)
    },
    [],
  )

  return {
    notifications: userId && notificationsOwnerId === userId ? notifications : [],
    loading: userId
      ? (notificationsOwnerId !== userId ? true : loading)
      : false,
    loadingMore: Boolean(userId && notificationsOwnerId === userId && loadingMore),
    hasMore: Boolean(userId && notificationsOwnerId === userId && hasMore),
    error: userId && notificationsOwnerId === userId ? error : null,
    loadMoreError: userId && notificationsOwnerId === userId
      ? loadMoreError
      : null,
    retry,
    loadMore,
    isVisuallyUnread,
  }
}
