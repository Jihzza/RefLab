import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useBilling } from '@/features/billing/components/useBilling'
import PlansSection from './PlansSection'
import SubscriptionCard from './SubscriptionCard'
import InvoiceHistory from './InvoiceHistory'
import CancelDialog from './CancelDialog'
import ChangePlanDialog from './ChangePlanDialog'
import { useTranslation } from 'react-i18next'

export default function PricingPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { subscription, planId, isLoading, error, refreshBilling } = useBilling()

  // Dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false)
  const [targetPlan, setTargetPlan] = useState<'pro' | 'plus'>('pro')

  // Checkout success banner
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const pollCountRef = useRef(0)

  // Handle ?checkout=success after returning from Stripe
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

  // Hide success banner after subscription data arrives
  useEffect(() => {
    if (checkoutSuccess && subscription) {
      const timeout = setTimeout(() => setCheckoutSuccess(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [checkoutSuccess, subscription])

  /** Open the change plan dialog with a target */
  const handleChangePlan = (plan: 'pro' | 'plus') => {
    setTargetPlan(plan)
    setChangePlanDialogOpen(true)
  }

  /** After a successful cancel or plan change, refresh billing data */
  const handleActionSuccess = async () => {
    await refreshBilling()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-16 text-(--text-muted)">
        <div className="w-4 h-4 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">{t('Loading...')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="card-console flex flex-col items-center text-center px-4 py-10">
          <p className="text-(--text-secondary) text-sm mb-4">{error}</p>
          <Button variant="primary" size="sm" onClick={() => refreshBilling()}>
            {t('Retry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <span
          className="flex-shrink-0 w-10 h-10 rounded-(--radius-button) bg-(--bg-surface-2) border border-(--border-subtle) flex items-center justify-center"
          aria-hidden="true"
        >
          <CreditCard className="w-5 h-5 text-(--brand-yellow)" />
        </span>
        <div>
          <span className="eyebrow">{t('Membership')}</span>
          <h1 className="text-xl font-bold text-(--text-primary) leading-tight">{t('Pricing & Billing')}</h1>
        </div>
      </div>

      {/* Checkout success banner */}
      {checkoutSuccess && (
        <div
          className="flex items-center justify-center gap-2 bg-(--success)/10 border border-(--success)/20 text-(--success) px-4 py-3 rounded-(--radius-button) mb-6 text-center text-sm font-semibold animate-fade-in"
          role="status"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {subscription
            ? t('Welcome to {{plan}}!', {
                plan: subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1),
              })
            : t('Processing your subscription...')}
        </div>
      )}

      {/* Current subscription card (only shown for paid users) */}
      {subscription && ['active', 'trialing', 'past_due'].includes(subscription.status) && (
        <SubscriptionCard
          subscription={subscription}
          planId={planId}
          onCancel={() => setCancelDialogOpen(true)}
        />
      )}

      {/* Plans comparison */}
      <PlansSection onChangePlan={handleChangePlan} />

      {/* Purchase history (only for users who have/had a subscription) */}
      {subscription && <InvoiceHistory />}

      {/* Cancel dialog */}
      {subscription && (
        <CancelDialog
          isOpen={cancelDialogOpen}
          onClose={() => setCancelDialogOpen(false)}
          subscription={subscription}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Change plan dialog */}
      {subscription && (
        <ChangePlanDialog
          isOpen={changePlanDialogOpen}
          onClose={() => setChangePlanDialogOpen(false)}
          subscription={subscription}
          targetPlan={targetPlan}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  )
}
