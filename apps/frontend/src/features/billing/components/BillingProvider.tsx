import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getSubscription } from '../api/billingApi'
import { BillingContext } from './BillingContext'
import type { Subscription, PlanId } from '../types'

interface BillingProviderProps {
  children: ReactNode
}

export function BillingProvider({ children }: BillingProviderProps) {
  const { user, authStatus, legalAcceptanceStatus } = useAuth()
  const userId = user?.id ?? null
  const canAccessBilling = Boolean(
    userId &&
    authStatus === 'authenticated' &&
    legalAcceptanceStatus === 'accepted',
  )
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [billingOwnerId, setBillingOwnerId] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const activeUserIdRef = useRef(userId)
  const canAccessBillingRef = useRef(canAccessBilling)
  const billingOwnerIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  useLayoutEffect(() => {
    activeUserIdRef.current = userId
    canAccessBillingRef.current = canAccessBilling
  }, [canAccessBilling, userId])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
    }
  }, [])

  const fetchBilling = useCallback(async () => {
    const requestedUserId = userId

    // A refresh function can survive in a consumer after auth has switched.
    // Reject it before it can start network work or invalidate B's request.
    if (
      !requestedUserId ||
      authStatus !== 'authenticated' ||
      legalAcceptanceStatus !== 'accepted' ||
      !mountedRef.current ||
      activeUserIdRef.current !== requestedUserId ||
      !canAccessBillingRef.current
    ) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    billingOwnerIdRef.current = requestedUserId
    setBillingOwnerId(requestedUserId)

    setIsLoading(true)
    setError(null)

    // Re-check immediately before the external read. In particular, a stale A
    // callback must not consume the current Supabase session after B is active.
    if (
      requestId !== requestIdRef.current ||
      activeUserIdRef.current !== requestedUserId ||
      billingOwnerIdRef.current !== requestedUserId ||
      !canAccessBillingRef.current
    ) return

    let subResult: Awaited<ReturnType<typeof getSubscription>>
    try {
      subResult = await getSubscription()
    } catch (caughtError) {
      subResult = {
        subscription: null,
        error: caughtError instanceof Error
          ? caughtError
          : new Error('Unexpected billing error'),
      }
    }

    if (
      requestId !== requestIdRef.current ||
      !mountedRef.current ||
      activeUserIdRef.current !== requestedUserId ||
      billingOwnerIdRef.current !== requestedUserId ||
      !canAccessBillingRef.current
    ) return

    if (subResult.error) {
      setError(subResult.error.message)
    }
    setSubscription(
      subResult.subscription?.user_id === requestedUserId
        ? subResult.subscription
        : null,
    )
    setIsLoading(false)
  }, [authStatus, legalAcceptanceStatus, userId])

  // Fetch billing data when user becomes authenticated
  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      if (
        canAccessBilling &&
        userId
      ) {
        void fetchBilling()
      } else {
        requestIdRef.current += 1
        billingOwnerIdRef.current = null
        setBillingOwnerId(null)
        setSubscription(null)
        setError(null)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
      requestIdRef.current += 1
    }
  }, [canAccessBilling, fetchBilling, userId])

  // Every public field belongs to one authenticated account. State can survive
  // an auth rerender until effects run, so gate the whole context synchronously.
  const ownsVisibleBilling = Boolean(
    canAccessBilling &&
    userId &&
    billingOwnerId === userId,
  )
  const visibleSubscription = ownsVisibleBilling && subscription?.user_id === userId
    ? subscription
    : null
  const visibleIsLoading = ownsVisibleBilling ? isLoading : false
  const visibleError = ownsVisibleBilling ? error : null

  // Derive plan only from data owned by the active account.
  const planId: PlanId = visibleSubscription &&
    ['active', 'trialing', 'past_due'].includes(visibleSubscription.status)
    ? visibleSubscription.plan
    : 'free'

  const isPro = planId === 'pro' || planId === 'plus'
  const isPlus = planId === 'plus'

  return (
    <BillingContext.Provider
      value={{
        subscription: visibleSubscription,
        planId,
        isLoading: visibleIsLoading,
        error: visibleError,
        refreshBilling: fetchBilling,
        isPro,
        isPlus,
      }}
    >
      {children}
    </BillingContext.Provider>
  )
}
