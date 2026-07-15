import { useState } from 'react'
import { AlertTriangle, CalendarDays, CreditCard, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Surface } from '@/components/ui'
import { createPortalSession } from '@/features/billing/api/billingApi'
import PlanBadge from '@/features/billing/components/PlanBadge'
import type { PlanId, Subscription } from '@/features/billing/types'

interface SubscriptionCardProps {
  subscription: Subscription
  planId: PlanId
  onCancel: () => void
}

export default function SubscriptionCard({
  subscription,
  planId,
  onCancel,
}: SubscriptionCardProps) {
  const { t, i18n } = useTranslation()
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState(false)

  const isCancelPending = subscription.cancel_at_period_end
  const planName = planId === 'free' ? 'Free' : planId === 'pro' ? 'Pro' : 'Plus'

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString(
    i18n.language || 'pt-PT',
    { year: 'numeric', month: 'short', day: 'numeric' },
  )

  const handleManageSubscription = async () => {
    if (portalLoading) return
    setPortalLoading(true)
    setPortalError(false)

    try {
      const { url, error } = await createPortalSession()
      if (error || !url) throw error || new Error('Missing portal URL')
      window.location.assign(url)
    } catch (error) {
      console.error('Failed to open Stripe portal:', error)
      setPortalError(true)
      setPortalLoading(false)
    }
  }

  const statusVariant = subscription.status === 'active'
    ? 'success'
    : subscription.status === 'past_due'
      ? 'warning'
      : 'neutral'

  return (
    <Surface
      padding="none"
      className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
      aria-labelledby="current-subscription-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border border-(--mc-color-accent)/40 bg-(--mc-color-accent)/10 text-(--mc-color-accent)"
            aria-hidden="true"
          >
            <CreditCard className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="mc-eyebrow mb-1">{t('Current Plan')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="current-subscription-title" className="text-xl font-extrabold capitalize text-(--mc-color-text)">
                {t(planName)}
              </h2>
              <PlanBadge planId={planId} />
            </div>
          </div>
        </div>
        <Badge variant={statusVariant} dot>
          {t(subscription.status.replaceAll('_', ' '))}
        </Badge>
      </div>

      {subscription.current_period_end && (
        <div className="flex items-center justify-between gap-4 border-t border-(--mc-color-border) bg-(--mc-color-canvas) px-4 py-3 text-sm sm:px-5">
          <span className="flex items-center gap-2 text-(--mc-color-text-secondary)">
            <CalendarDays className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
            {isCancelPending ? t('Active until') : t('Next renewal')}
          </span>
          <time className="font-semibold tabular-nums text-(--mc-color-text)" dateTime={subscription.current_period_end}>
            {formatDate(subscription.current_period_end)}
          </time>
        </div>
      )}

      {(isCancelPending || subscription.status === 'past_due' || portalError) && (
        <div className="space-y-2 border-t border-(--mc-color-border) px-4 py-3 sm:px-5">
          {isCancelPending && (
            <p className="flex items-start gap-2 text-sm leading-5 text-(--mc-color-warning)" role="status">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('Your subscription will be canceled at the end of the current billing period.')}
            </p>
          )}
          {subscription.status === 'past_due' && (
            <p className="flex items-start gap-2 text-sm leading-5 text-(--mc-color-danger)" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('Your last payment failed. Please update your payment method to keep your subscription.')}
            </p>
          )}
          {portalError && (
            <p className="flex items-start gap-2 text-sm leading-5 text-(--mc-color-danger)" role="alert">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('Failed to open billing portal. Please try again.')}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-2 border-t border-(--mc-color-border) px-4 py-4 sm:grid-cols-2 sm:px-5">
        {!isCancelPending && (
          <Button variant="secondary" fullWidth onClick={onCancel}>
            {t('Cancel Subscription')}
          </Button>
        )}
        <Button
          variant="secondary"
          fullWidth
          onClick={() => void handleManageSubscription()}
          loading={portalLoading}
          loadingText={t('Opening...')}
          trailingIcon={<ExternalLink className="size-4" />}
          className={isCancelPending ? 'sm:col-span-2' : ''}
        >
          {t('Manage via Stripe')}
        </Button>
      </div>
    </Surface>
  )
}
