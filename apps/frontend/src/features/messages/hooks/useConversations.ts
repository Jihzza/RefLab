import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { getConversations, getTotalUnreadCount } from '../api/messagesApi'
import type { Conversation } from '../types'

const REALTIME_REFRESH_DELAY_MS = 120

export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchAll = useCallback(async (showLoading: boolean) => {
    if (!user?.id) {
      requestIdRef.current += 1
      setConversations([])
      setTotalUnread(0)
      setError(null)
      setIsLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    if (showLoading) setIsLoading(true)

    try {
      const [convRes, unreadRes] = await Promise.all([
        getConversations(user.id),
        getTotalUnreadCount(user.id),
      ])

      if (requestId !== requestIdRef.current) return

      if (convRes.error) {
        setError(convRes.error.message)
        return
      }

      if (unreadRes.error) {
        setError(unreadRes.error.message)
        return
      }

      setError(null)
      setConversations(convRes.data)
      setTotalUnread(unreadRes.data)
    } finally {
      if (requestId === requestIdRef.current && showLoading) {
        setIsLoading(false)
      }
    }
  }, [user?.id])

  useEffect(() => {
    void fetchAll(true)
  }, [fetchAll])

  const refresh = useCallback(async () => {
    await fetchAll(false)
  }, [fetchAll])

  useEffect(() => {
    if (!user?.id) return

    let refreshTimer: number | null = null
    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null
        void fetchAll(false)
      }, REALTIME_REFRESH_DELAY_MS)
    }

    const channel = supabase
      .channel(`conversation-list:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        scheduleRefresh,
      )
      .subscribe()

    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [fetchAll, user?.id])

  return {
    conversations,
    totalUnread,
    isLoading,
    error,
    refresh,
  }
}
