import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { useBillingRequestIdentity } from '@/features/billing/hooks/useBillingRequestIdentity'
import { listInvoices } from '../api/pricingApi'
import type { Invoice } from '../types'

/**
 * Hook for lazy-loading invoice history from Stripe.
 * Invoices are only fetched when fetchInvoices() is called.
 */
export function useInvoices() {
  const { user } = useAuth()
  const captureBillingIdentity = useBillingRequestIdentity()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [dataOwnerId, setDataOwnerId] = useState<string | null>(null)
  const requestRevisionRef = useRef(0)

  const fetchInvoices = useCallback(async (limit = 10) => {
    const identity = captureBillingIdentity()
    if (!identity) return
    const requestRevision = requestRevisionRef.current + 1
    requestRevisionRef.current = requestRevision
    setDataOwnerId(identity.expectedUserId)
    setLoading(true)
    setError(null)

    const result = await listInvoices(
      identity.accessToken,
      identity.expectedUserId,
      limit,
    )

    if (
      requestRevisionRef.current !== requestRevision
      || !identity.isCurrent()
    ) return

    if (result.error) {
      setError(result.error.message)
    }

    setInvoices(result.invoices)
    setHasMore(result.hasMore)
    setLoading(false)
  }, [captureBillingIdentity])

  const ownsVisibleInvoices = Boolean(user?.id && dataOwnerId === user.id)

  return {
    invoices: ownsVisibleInvoices ? invoices : [],
    loading: ownsVisibleInvoices ? loading : false,
    error: ownsVisibleInvoices ? error : null,
    hasMore: ownsVisibleInvoices ? hasMore : false,
    fetchInvoices,
  }
}
