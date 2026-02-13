import { useState, useCallback } from 'react'
import { listInvoices } from '../api/pricingApi'
import type { Invoice } from '../types'

/**
 * Hook for lazy-loading invoice history from Stripe.
 * Invoices are only fetched when fetchInvoices() is called.
 */
export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchInvoices = useCallback(async (limit = 10) => {
    setLoading(true)
    setError(null)

    const result = await listInvoices(limit)

    if (result.error) {
      setError(result.error.message)
    }

    setInvoices(result.invoices)
    setHasMore(result.hasMore)
    setLoading(false)
  }, [])

  return { invoices, loading, error, hasMore, fetchInvoices }
}
