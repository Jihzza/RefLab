import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { fetchBlockedUsers } from '../api/settingsApi'
import { unblockUser } from '@/features/social/api/socialApi'
import type { BlockedUser } from '../types'

export function useBlockedUsers() {
  const { user } = useAuth()
  const userId = user?.id

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(() => Boolean(userId))
  const [error, setError] = useState<string | null>(null)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  // Load blocked users on mount
  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { blockedUsers: users, error: fetchError } = await fetchBlockedUsers(userId!)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setBlockedUsers(users)
      setLoading(false)
    }

    const timeoutId = window.setTimeout(() => void load(), 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [userId])

  // Unblock a user: optimistic removal from list
  const unblock = useCallback(
    async (blockedId: string) => {
      if (!userId) return

      setUnblocking(blockedId)

      // Optimistic removal
      setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedId))

      const { error: unblockError } = await unblockUser(userId, blockedId)

      if (unblockError) {
        console.error('Failed to unblock user:', unblockError)
        // Re-fetch to restore accurate state
        const { blockedUsers: users } = await fetchBlockedUsers(userId)
        setBlockedUsers(users)
      }

      setUnblocking(null)
    },
    [userId]
  )

  return {
    blockedUsers,
    loading,
    error,
    unblocking,
    unblock,
  }
}
