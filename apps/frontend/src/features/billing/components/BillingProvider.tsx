import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getSubscription, getInvoices } from '../api/billingApi'
import { BillingContext } from './BillingContext'
import type { Subscription, Invoice, PlanId } from '../types'

interface BillingProviderProps {
  children: ReactNode
}

export function BillingProvider({ children }: BillingProviderProps) {
  const { user, authStatus } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBilling = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setInvoices([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const [subResult, invResult] = await Promise.all([
      getSubscription(),
      getInvoices(),
    ])

    if (subResult.error) {
      setError(subResult.error.message)
    }
    setSubscription(subResult.subscription)
    setInvoices(invResult.invoices)
    setIsLoading(false)
  }, [user])

  // Fetch billing data when user becomes authenticated
  useEffect(() => {
    if (authStatus === 'authenticated' && user) {
      fetchBilling()
    } else if (authStatus === 'unauthenticated') {
      setSubscription(null)
      setInvoices([])
      setError(null)
    }
  }, [authStatus, user, fetchBilling])

  // Derive plan from subscription
  const planId: PlanId = subscription &&
    ['active', 'trialing', 'past_due'].includes(subscription.status)
    ? subscription.plan_id
    : 'free'

  const isPro = planId === 'pro' || planId === 'enterprise'
  const isEnterprise = planId === 'enterprise'

  return (
    <BillingContext.Provider
      value={{
        subscription,
        invoices,
        planId,
        isLoading,
        error,
        refreshBilling: fetchBilling,
        isPro,
        isEnterprise,
      }}
    >
      {children}
    </BillingContext.Provider>
  )
}
