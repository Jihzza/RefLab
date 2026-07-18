import { useCallback, useLayoutEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import type { BillingRequestIdentity } from '../api/billingFunctionClient'

export interface CapturedBillingRequestIdentity extends BillingRequestIdentity {
  isCurrent: () => boolean
}

/**
 * Captures the access token and owner together. Async continuations must call
 * isCurrent before redirecting or mutating UI state.
 */
export function useBillingRequestIdentity() {
  const { session, user } = useAuth()
  const currentOwnerId = user?.id ?? null
  const activeOwnerIdRef = useRef(currentOwnerId)
  const mountedRef = useRef(true)

  useLayoutEffect(() => {
    activeOwnerIdRef.current = currentOwnerId
  }, [currentOwnerId])

  useLayoutEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return useCallback((): CapturedBillingRequestIdentity | null => {
    const expectedUserId = user?.id ?? null
    if (
      !expectedUserId
      || !session?.access_token
      || session.user.id !== expectedUserId
      || activeOwnerIdRef.current !== expectedUserId
      || !mountedRef.current
    ) {
      return null
    }

    return {
      accessToken: session.access_token,
      expectedUserId,
      isCurrent: () => (
        mountedRef.current
        && activeOwnerIdRef.current === expectedUserId
      ),
    }
  }, [session, user?.id])
}
