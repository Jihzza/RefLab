import { useState } from 'react'
import PlanBadge from '@/features/billing/components/PlanBadge'
import { createPortalSession } from '@/features/billing/api/billingApi'
import type { Subscription } from '@/features/billing/types'
import type { PlanId } from '@/features/billing/types'

interface SubscriptionCardProps {
  subscription: Subscription
  planId: PlanId
  onCancel: () => void
}

export default function SubscriptionCard({ subscription, planId, onCancel }: SubscriptionCardProps) {
  const [portalLoading, setPortalLoading] = useState(false)

  const isCancelPending = subscription.cancel_at_period_end

  /** Format a date string for display */
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  /** Open Stripe Customer Portal */
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

  /** Color for subscription status */
  const statusColor =
    subscription.status === 'active'
      ? 'text-(--success)'
      : subscription.status === 'past_due'
        ? 'text-(--warning)'
        : 'text-(--text-muted)'

  return (
    <section
      className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) p-5 mb-6"
      aria-label="Your subscription"
    >
      {/* Plan name and badge */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm text-(--text-muted) mb-1">Current Plan</h2>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-(--text-primary) capitalize">{planId}</span>
            <PlanBadge planId={planId} />
          </div>
        </div>
      </div>

      {/* Subscription details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-(--text-secondary)">
          <span>Status</span>
          <span className={`font-medium capitalize ${statusColor}`}>
            {subscription.status.replace('_', ' ')}
          </span>
        </div>

        {subscription.current_period_end && (
          <div className="flex justify-between text-(--text-secondary)">
            <span>{isCancelPending ? 'Active until' : 'Next renewal'}</span>
            <span>{formatDate(subscription.current_period_end)}</span>
          </div>
        )}
      </div>

      {/* Cancel pending warning */}
      {isCancelPending && (
        <div
          className="bg-(--warning)/10 border border-(--warning)/20 text-(--warning) text-sm px-3 py-2 rounded-lg mt-3"
          role="alert"
        >
          Your subscription will be canceled at the end of the current billing period.
        </div>
      )}

      {/* Past due warning */}
      {subscription.status === 'past_due' && (
        <div
          className="bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm px-3 py-2 rounded-lg mt-3"
          role="alert"
        >
          Your last payment failed. Please update your payment method to keep your subscription.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-5">
        {!isCancelPending && (
          <button
            onClick={onCancel}
            aria-label="Cancel subscription"
            className="flex-1 py-2.5 rounded-(--radius-button) text-sm font-medium border border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-hover) transition-colors"
          >
            Cancel Subscription
          </button>
        )}

        <button
          onClick={handleManageSubscription}
          disabled={portalLoading}
          aria-label="Manage subscription via Stripe"
          className="flex-1 py-2.5 bg-(--bg-surface-2) text-(--text-primary) rounded-(--radius-button) text-sm font-medium hover:bg-(--bg-surface-2)/80 border border-(--border-subtle) transition-colors disabled:opacity-50"
        >
          {portalLoading ? 'Opening...' : 'Manage via Stripe'}
        </button>
      </div>
    </section>
  )
}
