import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getSubscription } from '../api/billingApi'
import { BillingContext } from './BillingContext'
import type { Subscription, PlanId } from '../types'

interface BillingProviderProps {
  children: ReactNode
}

export function BillingProvider({ children }: BillingProviderProps) {
  const { user, authStatus } = useAuth()
  const userId = user?.id
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBilling = useCallback(async () => {
    if (!userId) {
      setSubscription(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const subResult = await getSubscription()

    if (subResult.error) {
      setError(subResult.error.message)
    }
    setSubscription(subResult.subscription)
    setIsLoading(false)
  }, [userId])

  // Fetch billing data when user becomes authenticated
  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId) return

    // Defer the async refresh so the effect only schedules external work.
    const timer = window.setTimeout(() => {
      void fetchBilling()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [authStatus, userId, fetchBilling])

  const currentSubscription = authStatus === 'authenticated'
    ? subscription
    : null
  const currentError = authStatus === 'authenticated' ? error : null

  // Derive plan from subscription
  const planId: PlanId = currentSubscription &&
    ['active', 'trialing', 'past_due'].includes(currentSubscription.status)
    ? currentSubscription.plan
    : 'free'

  const isPro = planId === 'pro' || planId === 'plus'
  const isPlus = planId === 'plus'

  return (
    <BillingContext.Provider
      value={{
        subscription: currentSubscription,
        planId,
        isLoading,
        error: currentError,
        refreshBilling: fetchBilling,
        isPro,
        isPlus,
      }}
    >
      {children}
    </BillingContext.Provider>
  )
}
