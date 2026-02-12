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
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBilling = useCallback(async () => {
    if (!user) {
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
  }, [user])

  // Fetch billing data when user becomes authenticated
  useEffect(() => {
    if (authStatus === 'authenticated' && user) {
      fetchBilling()
    } else if (authStatus === 'unauthenticated') {
      setSubscription(null)
      setError(null)
    }
  }, [authStatus, user, fetchBilling])

  // Derive plan from subscription
  const planId: PlanId = subscription &&
    ['active', 'trialing', 'past_due'].includes(subscription.status)
    ? subscription.plan
    : 'free'

  const isPro = planId === 'pro' || planId === 'plus'
  const isPlus = planId === 'plus'

  return (
    <BillingContext.Provider
      value={{
        subscription,
        planId,
        isLoading,
        error,
        refreshBilling: fetchBilling,
        isPro,
        isPlus,
      }}
    >
      {children}
    </BillingContext.Provider>
  )
}
