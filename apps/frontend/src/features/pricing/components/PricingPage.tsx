import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import DocumentPage from '@/app/layouts/DocumentPage'
import { useBilling } from '@/features/billing/components/useBilling'
import PlansSection from './PlansSection'
import SubscriptionCard from './SubscriptionCard'
import InvoiceHistory from './InvoiceHistory'
import CancelDialog from './CancelDialog'
import { useTranslation } from 'react-i18next'

export default function PricingPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { subscription, planId, isLoading, refreshBilling } = useBilling()

  // Dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  // Checkout success banner
  const [checkoutSuccess, setCheckoutSuccess] = useState(
    () => searchParams.get('checkout') === 'success',
  )
  const pollCountRef = useRef(0)

  // Handle ?checkout=success after returning from Stripe
  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return

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

  /** After a successful cancel or plan change, refresh billing data */
  const handleActionSuccess = async () => {
    await refreshBilling()
  }

  if (isLoading) {
    return (
      <DocumentPage ariaLabel={t('Pricing & Billing')} title={t('Pricing & Billing')} width="wide">
        <div className="space-y-4" aria-label={t('Loading...')}>
          <div className="h-36 animate-pulse rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface)" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-96 animate-pulse rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface)" />
            ))}
          </div>
        </div>
      </DocumentPage>
    )
  }

  return (
    <DocumentPage
      ariaLabel={t('Pricing & Billing')}
      eyebrow="Match Control"
      title={t('Pricing & Billing')}
      width="wide"
      actions={(
        <span className="flex size-11 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-accent)">
          <CreditCard className="size-5" aria-hidden="true" />
        </span>
      )}
    >
      {checkoutSuccess && (
        <div
          className="mb-6 rounded-(--mc-radius-input) border border-(--mc-color-success)/30 bg-(--mc-color-success)/10 px-4 py-3 text-center text-sm font-semibold text-(--mc-color-success)"
          role="status"
        >
          {subscription
            ? t('Welcome to {{plan}}!', {
                plan: subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1),
              })
            : t('Processing your subscription...')}
        </div>
      )}

      {subscription && ['active', 'trialing', 'past_due'].includes(subscription.status) && (
        <SubscriptionCard
          subscription={subscription}
          planId={planId}
          onCancel={() => setCancelDialogOpen(true)}
        />
      )}

      <PlansSection />

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

    </DocumentPage>
  )
}
