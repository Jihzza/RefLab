import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { unblockUser } from '@/features/social/api/socialApi'
import { fetchBlockedUsers } from '../api/settingsApi'
import type { BlockedUser } from '../types'

const EMPTY_UNBLOCKING_IDS: ReadonlySet<string> = new Set()

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unexpected blocked-users error')
}

export function useBlockedUsers() {
  const { user } = useAuth()
  const userId = user?.id
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unblockingIds, setUnblockingIds] = useState<ReadonlySet<string>>(new Set())
  const [dataOwnerId, setDataOwnerId] = useState<string | undefined>(undefined)

  const blockedUsersRef = useRef<BlockedUser[]>([])
  const dataOwnerIdRef = useRef<string | undefined>(undefined)
  const unblockingIdsRef = useRef(new Set<string>())
  const unblockingUserIdRef = useRef<string | undefined>(undefined)
  const requestIdRef = useRef(0)
  const activeUserIdRef = useRef(userId)
  const mountedRef = useRef(true)

  activeUserIdRef.current = userId

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const replaceBlockedUsers = useCallback((users: BlockedUser[]) => {
    blockedUsersRef.current = users
    setBlockedUsers(users)
  }, [])

  const load = useCallback(async () => {
    if (activeUserIdRef.current !== userId) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!userId) {
      dataOwnerIdRef.current = undefined
      setDataOwnerId(undefined)
      unblockingIdsRef.current.clear()
      unblockingUserIdRef.current = undefined
      setUnblockingIds(new Set())
      replaceBlockedUsers([])
      setError(null)
      setLoading(false)
      return
    }

    const ownerChanged = dataOwnerIdRef.current !== userId
    dataOwnerIdRef.current = userId
    setDataOwnerId(userId)

    if (ownerChanged || unblockingUserIdRef.current !== userId) {
      unblockingIdsRef.current.clear()
      unblockingUserIdRef.current = userId
      setUnblockingIds(new Set())
    }
    if (ownerChanged) replaceBlockedUsers([])

    setLoading(true)
    setError(null)

    try {
      const { blockedUsers: users, error: fetchError } = await fetchBlockedUsers(userId)
      if (
        requestIdRef.current !== requestId ||
        activeUserIdRef.current !== userId ||
        dataOwnerIdRef.current !== userId
      ) return

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      replaceBlockedUsers(users)
    } catch (loadError) {
      if (
        requestIdRef.current === requestId &&
        activeUserIdRef.current === userId &&
        dataOwnerIdRef.current === userId
      ) {
        setError(toError(loadError).message)
      }
    } finally {
      if (
        requestIdRef.current === requestId &&
        activeUserIdRef.current === userId &&
        dataOwnerIdRef.current === userId
      ) {
        setLoading(false)
      }
    }
  }, [replaceBlockedUsers, userId])

  useEffect(() => {
    void load()
    return () => {
      requestIdRef.current += 1
    }
  }, [load])

  const unblock = useCallback(async (blockedId: string) => {
    if (
      !userId ||
      activeUserIdRef.current !== userId ||
      dataOwnerId !== userId ||
      dataOwnerIdRef.current !== userId ||
      loading
    ) return
    if (unblockingUserIdRef.current !== userId) {
      unblockingIdsRef.current.clear()
      unblockingUserIdRef.current = userId
    }
    if (unblockingIdsRef.current.has(blockedId)) return

    const previousUsers = blockedUsersRef.current
    const removedIndex = previousUsers.findIndex((blockedUser) => blockedUser.id === blockedId)
    if (removedIndex < 0) return
    const removedUser = previousUsers[removedIndex]

    unblockingIdsRef.current.add(blockedId)
    setUnblockingIds(new Set(unblockingIdsRef.current))
    setError(null)
    replaceBlockedUsers(previousUsers.filter((blockedUser) => blockedUser.id !== blockedId))

    let unblockError: Error | null = null

    try {
      const result = await unblockUser(userId, blockedId)
      unblockError = result.error
    } catch (caughtError) {
      unblockError = toError(caughtError)
    }

    if (
      mountedRef.current &&
      activeUserIdRef.current === userId &&
      dataOwnerIdRef.current === userId &&
      unblockError
    ) {
      const currentUsers = blockedUsersRef.current
      if (!currentUsers.some((blockedUser) => blockedUser.id === blockedId)) {
        const restoredUsers = [...currentUsers, removedUser].sort(
          (first, second) => second.blocked_at.localeCompare(first.blocked_at),
        )
        replaceBlockedUsers(restoredUsers)
      }
      setError(unblockError.message)
    }

    if (unblockingUserIdRef.current === userId) {
      unblockingIdsRef.current.delete(blockedId)
    }
    if (
      activeUserIdRef.current === userId &&
      dataOwnerIdRef.current === userId &&
      mountedRef.current &&
      unblockingUserIdRef.current === userId
    ) {
      setUnblockingIds(new Set(unblockingIdsRef.current))
    }
  }, [dataOwnerId, loading, replaceBlockedUsers, userId])

  const ownsVisibleData = Boolean(userId && dataOwnerId === userId)

  return {
    blockedUsers: ownsVisibleData ? blockedUsers : [],
    loading: userId ? !ownsVisibleData || loading : false,
    error: ownsVisibleData ? error : null,
    unblockingIds: ownsVisibleData ? unblockingIds : EMPTY_UNBLOCKING_IDS,
    unblock,
    retry: load,
  }
}
