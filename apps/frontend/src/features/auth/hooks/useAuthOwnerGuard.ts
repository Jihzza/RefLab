import { useCallback, useEffect, useRef } from 'react'

/**
 * Keeps asynchronous UI continuations scoped to the authenticated owner that
 * started them. Owner-keyed parents remount on an account boundary; the
 * mounted flag also prevents a promise from the removed owner from navigating
 * or writing state after that remount.
 */
export function useAuthOwnerGuard(
  ownerId: string | null,
  currentOwnerId: string | null,
) {
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return useCallback(() => (
    mountedRef.current
    && ownerId !== null
    && currentOwnerId === ownerId
  ), [currentOwnerId, ownerId])
}
