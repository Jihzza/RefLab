import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getConversations, getTotalUnreadCount } from '../api/messagesApi'
import type { Conversation } from '../types'

export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)

    try {
      const [convRes, unreadRes] = await Promise.all([
        getConversations(user.id),
        getTotalUnreadCount(user.id),
      ])

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
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    fetchAll()
  }, [user?.id, fetchAll])

  const refresh = useCallback(async () => {
    await fetchAll()
  }, [fetchAll])

  return {
    conversations,
    totalUnread,
    isLoading,
    error,
    refresh,
  }
}

