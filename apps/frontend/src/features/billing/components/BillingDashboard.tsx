import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBilling } from './useBilling'
import { createPortalSession } from '../api/billingApi'
import PlanBadge from './PlanBadge'

export default function BillingDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { subscription, invoices, planId, isLoading, refreshBilling } = useBilling()
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const pollCountRef = useRef(0)

  // Handle checkout success polling
  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return

    setCheckoutSuccess(true)

    // Remove the query param from URL
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('checkout')
    setSearchParams(newParams, { replace: true })

    // Poll for subscription data if not yet available
    if (!subscription) {
      pollCountRef.current = 0
      const interval = window.setInterval(async () => {
        pollCountRef.current++
        await refreshBilling()
        if (pollCountRef.current >= 5) {
          clearInterval(interval)
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [searchParams, setSearchParams, subscription, refreshBilling])

  // Stop showing success banner once subscription is loaded
  useEffect(() => {
    if (checkoutSuccess && subscription) {
      // Keep the success banner visible for a moment after data arrives
      const timeout = setTimeout(() => setCheckoutSuccess(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [checkoutSuccess, subscription])

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    const { url, error } = await createPortalSession()
    setPortalLoading(false)

    if (error || !url) {
      console.error('Failed to open portal:', error)
      return
    }

    window.location.href = url
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-(--text-muted)">Loading billing...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-(--text-primary) mb-6">Billing</h1>

      {/* Checkout Success Banner */}
      {checkoutSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6 text-center text-sm font-medium">
          {subscription
            ? `Welcome to ${subscription.plan_id.charAt(0).toUpperCase() + subscription.plan_id.slice(1)}!`
            : 'Processing your subscription...'}
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm text-(--text-muted) mb-1">Current Plan</h2>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-(--text-primary) capitalize">{planId}</span>
              <PlanBadge planId={planId} />
            </div>
          </div>
          {subscription && (
            <div className="text-right">
              <p className="text-sm text-(--text-muted)">
                {formatAmount(subscription.amount, subscription.currency)}/{subscription.billing_interval === 'monthly' ? 'mo' : 'yr'}
              </p>
            </div>
          )}
        </div>

        {subscription && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-(--text-secondary)">
              <span>Status</span>
              <span className={`font-medium capitalize ${
                subscription.status === 'active' ? 'text-green-400' :
                subscription.status === 'past_due' ? 'text-(--brand-yellow)' :
                'text-(--text-muted)'
              }`}>
                {subscription.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between text-(--text-secondary)">
              <span>Next renewal</span>
              <span>{formatDate(subscription.current_period_end)}</span>
            </div>
            {subscription.cancel_at_period_end && (
              <div className="bg-(--brand-yellow)/10 border border-(--brand-yellow)/20 text-(--brand-yellow) text-sm px-3 py-2 rounded-lg mt-3">
                Your subscription will be canceled at the end of the current billing period ({formatDate(subscription.current_period_end)}).
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {planId === 'free' ? (
            <button
              onClick={() => navigate('/app/billing/pricing')}
              className="w-full py-2.5 bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) text-sm font-bold hover:bg-(--brand-yellow-soft) transition-colors"
            >
              Upgrade Plan
            </button>
          ) : (
            <>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex-1 py-2.5 bg-(--bg-surface-2) text-(--text-primary) rounded-(--radius-button) text-sm font-medium hover:bg-(--bg-surface-2)/80 border border-(--border-subtle) transition-colors disabled:opacity-50"
              >
                {portalLoading ? 'Opening...' : 'Manage Subscription'}
              </button>
              <button
                onClick={() => navigate('/app/billing/pricing')}
                className="flex-1 py-2.5 bg-(--bg-surface-2) text-(--text-secondary) rounded-(--radius-button) text-sm font-medium hover:bg-(--bg-surface-2)/80 border border-(--border-subtle) transition-colors"
              >
                Change Plan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-xl p-6">
          <h2 className="text-lg font-bold text-(--text-primary) mb-4">Invoice History</h2>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between py-2 border-b border-(--border-subtle) last:border-0"
              >
                <div>
                  <p className="text-sm text-(--text-primary)">
                    {formatDate(invoice.created_at)}
                  </p>
                  <p className="text-xs text-(--text-muted) capitalize">
                    {invoice.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-(--text-primary)">
                    {formatAmount(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                  </span>
                  {invoice.invoice_pdf && (
                    <a
                      href={invoice.invoice_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-(--brand-yellow) hover:underline"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
