import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { getConversations, getTotalUnreadCount } from '../api/messagesApi'
import { MESSAGES_UNREAD_CHANGED_EVENT, type Conversation } from '../types'

const REALTIME_REFRESH_DELAY_MS = 120

export function useConversations() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const activeUserIdRef = useRef(userId)
  const dataOwnerIdRef = useRef<string | null>(null)
  activeUserIdRef.current = userId

  const fetchAll = useCallback(async (showLoading: boolean) => {
    if (!userId) {
      requestIdRef.current += 1
      setConversations([])
      setTotalUnread(0)
      dataOwnerIdRef.current = null
      setDataOwnerId(null)
      setError(null)
      setIsLoading(false)
      return
    }

    const activeUserId = userId
    const requestId = ++requestIdRef.current
    if (showLoading) setIsLoading(true)

    try {
      const [convRes, unreadRes] = await Promise.all([
        getConversations(activeUserId),
        getTotalUnreadCount(activeUserId),
      ])

      if (
        requestId !== requestIdRef.current
        || activeUserIdRef.current !== activeUserId
      ) return

      if (convRes.error) {
        if (dataOwnerIdRef.current !== activeUserId) {
          setConversations([])
          setTotalUnread(0)
        }
        dataOwnerIdRef.current = activeUserId
        setDataOwnerId(activeUserId)
        setError(convRes.error.message)
        return
      }

      if (unreadRes.error) {
        if (dataOwnerIdRef.current !== activeUserId) {
          setConversations([])
          setTotalUnread(0)
        }
        dataOwnerIdRef.current = activeUserId
        setDataOwnerId(activeUserId)
        setError(unreadRes.error.message)
        return
      }

      setError(null)
      setConversations(convRes.data)
      setTotalUnread(unreadRes.data)
      dataOwnerIdRef.current = activeUserId
      setDataOwnerId(activeUserId)
    } finally {
      if (
        requestId === requestIdRef.current
        && activeUserIdRef.current === activeUserId
      ) {
        setIsLoading(false)
      }
    }
  }, [userId])

  useEffect(() => {
    const fetchTimer = window.setTimeout(() => void fetchAll(true), 0)
    return () => window.clearTimeout(fetchTimer)
  }, [fetchAll])

  const refresh = useCallback(async () => {
    await fetchAll(false)
  }, [fetchAll])

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
        void fetchAll(false)
      }, REALTIME_REFRESH_DELAY_MS)
    }

    const channel = supabase
      .channel(`conversation-list:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        scheduleRefresh,
      )
      .subscribe(status => {
        // Reconcile once the channel is actually joined so mutations between
        // the first snapshot and subscribe-ready cannot leave the list stale.
        if (status === 'SUBSCRIBED' && !cancelled) scheduleRefresh()
      })

    const refreshWhenReadable = () => {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }
    window.addEventListener(MESSAGES_UNREAD_CHANGED_EVENT, scheduleRefresh)
    window.addEventListener('focus', refreshWhenReadable)
    document.addEventListener('visibilitychange', refreshWhenReadable)

    return () => {
      cancelled = true
      requestIdRef.current += 1
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      window.removeEventListener(MESSAGES_UNREAD_CHANGED_EVENT, scheduleRefresh)
      window.removeEventListener('focus', refreshWhenReadable)
      document.removeEventListener('visibilitychange', refreshWhenReadable)
      void supabase.removeChannel(channel)
    }
  }, [fetchAll, userId])

  const ownsVisibleData = Boolean(userId && dataOwnerId === userId)

  return {
    conversations: ownsVisibleData ? conversations : [],
    totalUnread: ownsVisibleData ? totalUnread : 0,
    isLoading: userId && !ownsVisibleData ? true : isLoading,
    error: ownsVisibleData ? error : null,
    refresh,
  }
}
