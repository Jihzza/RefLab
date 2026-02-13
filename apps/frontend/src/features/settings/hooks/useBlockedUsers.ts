import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { fetchBlockedUsers } from '../api/settingsApi'
import { unblockUser } from '@/features/social/api/socialApi'
import type { BlockedUser } from '../types'

export function useBlockedUsers() {
  const { user } = useAuth()

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  // Load blocked users on mount
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { blockedUsers: users, error: fetchError } = await fetchBlockedUsers(user!.id)

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setBlockedUsers(users)
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Unblock a user: optimistic removal from list
  const unblock = useCallback(
    async (blockedId: string) => {
      if (!user?.id) return

      setUnblocking(blockedId)

      // Optimistic removal
      setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedId))

      const { error: unblockError } = await unblockUser(user.id, blockedId)

      if (unblockError) {
        console.error('Failed to unblock user:', unblockError)
        // Re-fetch to restore accurate state
        const { blockedUsers: users } = await fetchBlockedUsers(user.id)
        setBlockedUsers(users)
      }

      setUnblocking(null)
    },
    [user?.id]
  )

  return {
    blockedUsers,
    loading,
    error,
    unblocking,
    unblock,
  }
}
