import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, CreditCard } from 'lucide-react'
import { Button, Skeleton, Surface } from '@/components/ui'
import { useBilling } from '@/features/billing/components/useBilling'
import PlansSection from './PlansSection'
import SubscriptionCard from './SubscriptionCard'
import InvoiceHistory from './InvoiceHistory'
import CancelDialog from './CancelDialog'
import ChangePlanDialog from './ChangePlanDialog'
import { useTranslation } from 'react-i18next'
import { getAuthPlanFromSearch } from '@/features/auth/utils/authNavigation'
import { PAID_PLANS_ENABLED } from '@/features/billing/config'
import { useBillingRequestIdentity } from '@/features/billing/hooks/useBillingRequestIdentity'

export default function PricingPage() {
  const { t } = useTranslation()
  const captureBillingIdentity = useBillingRequestIdentity()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedPlan = getAuthPlanFromSearch(`?${searchParams.toString()}`)
  const {
    subscription,
    planId,
    isLoading,
    error: billingError,
    refreshBilling,
  } = useBilling()

  // Dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false)
  const [targetPlan, setTargetPlan] = useState<'pro' | 'plus'>('pro')

  // Checkout success banner
  const [checkoutSuccess, setCheckoutSuccess] = useState(
    () => searchParams.get('checkout') === 'success',
  )
  const [checkoutTimedOut, setCheckoutTimedOut] = useState(false)
  const shouldHandleCheckoutRef = useRef(checkoutSuccess)

  // Handle ?checkout=success after returning from Stripe
  useEffect(() => {
    if (!shouldHandleCheckoutRef.current) return
    const identity = captureBillingIdentity()
    if (!identity) return
    shouldHandleCheckoutRef.current = false

    // Remove the query param from URL
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete('checkout')
      return nextParams
    }, { replace: true })

    let cancelled = false
    let timeoutId: number | undefined
    let pollCount = 0

    const poll = async () => {
      pollCount += 1
      await refreshBilling()
      if (cancelled || !identity.isCurrent()) return

      if (pollCount < 5) {
        timeoutId = window.setTimeout(() => void poll(), 2000)
      } else {
        setCheckoutTimedOut(true)
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [captureBillingIdentity, refreshBilling, setSearchParams])

  // Hide success banner after subscription data arrives
  useEffect(() => {
    if (checkoutSuccess && subscription) {
      const timeout = setTimeout(() => setCheckoutSuccess(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [checkoutSuccess, subscription])

  /** Open the change plan dialog with a target */
  const handleChangePlan = (plan: 'pro' | 'plus') => {
    if (!PAID_PLANS_ENABLED) return
    setTargetPlan(plan)
    setChangePlanDialogOpen(true)
  }

  /** After a successful cancel or plan change, refresh billing data */
  const handleActionSuccess = async () => {
    await refreshBilling()
  }

  if (isLoading) {
    return <PricingSkeleton />
  }

  return (
    <div className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
        <header className="flex items-start gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border border-(--mc-color-accent)/40 bg-(--mc-color-accent)/10 text-(--mc-color-accent)"
            aria-hidden="true"
          >
            <CreditCard className="size-6" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="mc-eyebrow mb-1">Match Control</p>
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.035em] text-(--mc-color-text) sm:text-3xl">
              {t('Pricing & Billing')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-(--mc-color-text-secondary) sm:text-base">
              {t('Review plan information and manage your subscription, invoices and billing settings.')}
            </p>
          </div>
        </header>

        {checkoutSuccess && (
          <div
            className={`flex items-start gap-3 rounded-(--mc-radius-button) border px-4 py-3.5 text-sm ${checkoutTimedOut && !subscription ? 'border-(--mc-color-warning)/40 bg-(--mc-color-warning)/8 text-(--mc-color-warning)' : 'border-(--mc-color-success)/40 bg-(--mc-color-success)/8 text-(--mc-color-success)'}`}
            role="status"
            aria-live="polite"
          >
            {checkoutTimedOut && !subscription ? (
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {subscription
                  ? t('Welcome to {{plan}}!', {
                      plan: subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1),
                    })
                  : checkoutTimedOut
                    ? t('Your subscription is taking longer than expected to update.')
                    : t('Processing your subscription...')}
              </p>
              {checkoutTimedOut && !subscription && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const identity = captureBillingIdentity()
                    if (!identity) return
                    setCheckoutTimedOut(false)
                    void refreshBilling().finally(() => {
                      if (identity.isCurrent()) setCheckoutTimedOut(true)
                    })
                  }}
                  className="mt-1 -ml-3 text-(--mc-color-warning) hover:text-(--mc-color-warning)"
                >
                  {t('Check again')}
                </Button>
              )}
            </div>
          </div>
        )}

        {billingError && (
          <Surface
            padding="md"
            className="flex flex-wrap items-center gap-3 border-(--mc-color-danger)/40 shadow-none"
            role="alert"
          >
            <AlertTriangle className="size-5 shrink-0 text-(--mc-color-danger)" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm text-(--mc-color-danger)">
              {t('Failed to load billing information.')}
            </p>
            <Button variant="secondary" size="sm" onClick={() => void refreshBilling()}>
              {t('Try Again')}
            </Button>
          </Surface>
        )}

        {subscription && ['active', 'trialing', 'past_due'].includes(subscription.status) && (
          <SubscriptionCard
            subscription={subscription}
            planId={planId}
            onCancel={() => setCancelDialogOpen(true)}
          />
        )}

        <PlansSection
          key={requestedPlan ?? 'default'}
          initialPlan={requestedPlan ?? undefined}
          onChangePlan={handleChangePlan}
        />

        {subscription && <InvoiceHistory />}

        {subscription && (
          <CancelDialog
            isOpen={cancelDialogOpen}
            onClose={() => setCancelDialogOpen(false)}
            subscription={subscription}
            onSuccess={handleActionSuccess}
          />
        )}

        {PAID_PLANS_ENABLED && subscription && (
          <ChangePlanDialog
            isOpen={changePlanDialogOpen}
            onClose={() => setChangePlanDialogOpen(false)}
            subscription={subscription}
            targetPlan={targetPlan}
            onSuccess={handleActionSuccess}
          />
        )}
      </div>
    </div>
  )
}

function PricingSkeleton() {
  const { t } = useTranslation()

  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      role="status"
      aria-label={t('Loading...')}
    >
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width="2.75rem" height="2.75rem" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton variant="text" width="12rem" height="2rem" />
          <Skeleton variant="text" width="min(100%, 30rem)" />
        </div>
      </div>
      <Skeleton variant="rectangular" height="3.5rem" />
      <Skeleton variant="rectangular" height="30rem" />
      <span className="mc-visually-hidden">{t('Loading...')}</span>
    </div>
  )
}
