import { useState } from 'react'
import PlanBadge from '@/features/billing/components/PlanBadge'
import { createPortalSession } from '@/features/billing/api/billingApi'
import type { Subscription } from '@/features/billing/types'
import type { PlanId } from '@/features/billing/types'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CalendarDays, ExternalLink } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

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

  const statusVariant =
    subscription.status === 'active'
      ? 'success'
      : subscription.status === 'past_due'
        ? 'warning'
        : 'neutral'

  return (
    <section
      className="relative mb-8 overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface) p-5 shadow-(--mc-shadow-soft) sm:p-6"
      aria-label={t('Current Plan')}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-(--mc-color-accent)" aria-hidden="true" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="mc-eyebrow">{t('Current Plan')}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-extrabold capitalize tracking-tight text-(--mc-color-text)">{planId}</span>
            <PlanBadge planId={planId} />
          </div>
        </div>

        <div className="grid min-w-56 gap-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-(--mc-color-text-muted)">{t('Status')}</span>
            <Badge variant={statusVariant} dot className="capitalize">
            {subscription.status.replace('_', ' ')}
            </Badge>
          </div>

          {subscription.current_period_end && (
            <div className="flex items-center justify-between gap-4 text-(--mc-color-text-secondary)">
              <span className="inline-flex items-center gap-1.5 text-(--mc-color-text-muted)">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {isCancelPending ? t('Active until') : t('Next renewal')}
              </span>
              <span className="mc-tabular font-medium">{formatDate(subscription.current_period_end)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cancel pending warning */}
      {isCancelPending && (
        <div
          className="mt-4 flex items-start gap-2 rounded-(--mc-radius-input) border border-(--mc-color-warning)/30 bg-(--mc-color-warning)/10 px-3 py-2.5 text-sm text-(--mc-color-warning)"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t('Your subscription will be canceled at the end of the current billing period.')}</span>
        </div>
      )}

      {/* Past due warning */}
      {subscription.status === 'past_due' && (
        <div
          className="mt-4 flex items-start gap-2 rounded-(--mc-radius-input) border border-(--mc-color-danger)/30 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm text-(--mc-color-danger)"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t('Your last payment failed. Please update your payment method to keep your subscription.')}</span>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {!isCancelPending && (
          <Button
            variant="secondary"
            onClick={onCancel}
            aria-label={t('Cancel subscription')}
            className="sm:min-w-44"
          >
            {t('Cancel Subscription')}
          </Button>
        )}

        <Button
          variant="primary"
          onClick={handleManageSubscription}
          disabled={portalLoading}
          loading={portalLoading}
          loadingText={t('Opening...')}
          trailingIcon={<ExternalLink className="size-4" />}
          aria-label={t('Manage subscription via Stripe')}
          className="sm:min-w-44"
        >
          {t('Manage via Stripe')}
        </Button>
      </div>
    </section>
  )
}
