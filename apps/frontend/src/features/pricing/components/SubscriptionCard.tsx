import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import PlanBadge from '@/features/billing/components/PlanBadge'
import { createPortalSession } from '@/features/billing/api/billingApi'
import type { Subscription } from '@/features/billing/types'
import type { PlanId } from '@/features/billing/types'
import { useTranslation } from 'react-i18next'

interface SubscriptionCardProps {
  subscription: Subscription
  planId: PlanId
  onCancel: () => void
}

export default function SubscriptionCard({ subscription, planId, onCancel }: SubscriptionCardProps) {
  const { t } = useTranslation()
  const [portalLoading, setPortalLoading] = useState(false)

  const isCancelPending = subscription.cancel_at_period_end

  /** Format a date string for display */
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
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

  const statusDot =
    subscription.status === 'active'
      ? 'bg-(--success)'
      : subscription.status === 'past_due'
        ? 'bg-(--warning)'
        : 'bg-(--text-muted)'

  return (
    <section
      className="card-console p-5 mb-6"
      aria-label={t('Current Plan')}
    >
      {/* Plan name and badge */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <span className="eyebrow">{t('Current Plan')}</span>
          <div className="flex items-center gap-2.5 mt-1.5">
            <span className="text-2xl font-extrabold text-(--text-primary) capitalize">{planId}</span>
            <PlanBadge planId={planId} />
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold capitalize ${statusColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} aria-hidden="true" />
          {subscription.status.replace('_', ' ')}
        </span>
      </div>

      {/* Subscription details */}
      <div className="space-y-2.5 text-sm rounded-(--radius-button) bg-(--bg-surface-2)/60 border border-(--border-subtle) px-4 py-3">
        {subscription.current_period_end && (
          <div className="flex justify-between text-(--text-secondary)">
            <span>{isCancelPending ? t('Active until') : t('Next renewal')}</span>
            <span className="numeral font-medium text-(--text-primary)">
              {formatDate(subscription.current_period_end)}
            </span>
          </div>
        )}
      </div>

      {/* Cancel pending warning */}
      {isCancelPending && (
        <div
          className="flex items-start gap-2 bg-(--warning)/10 border border-(--warning)/20 text-(--warning) text-sm px-3 py-2.5 rounded-(--radius-button) mt-3"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          {t('Your subscription will be canceled at the end of the current billing period.')}
        </div>
      )}

      {/* Past due warning */}
      {subscription.status === 'past_due' && (
        <div
          className="flex items-start gap-2 bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm px-3 py-2.5 rounded-(--radius-button) mt-3"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          {t('Your last payment failed. Please update your payment method to keep your subscription.')}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-5">
        {!isCancelPending && (
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={onCancel}
            aria-label={t('Cancel subscription')}
          >
            {t('Cancel Subscription')}
          </Button>
        )}

        <Button
          variant="secondary"
          size="md"
          fullWidth
          loading={portalLoading}
          onClick={handleManageSubscription}
          aria-label={t('Manage subscription via Stripe')}
        >
          {portalLoading ? t('Opening...') : t('Manage via Stripe')}
        </Button>
      </div>
    </section>
  )
}
