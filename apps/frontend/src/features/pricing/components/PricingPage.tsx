import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { useBilling } from '@/features/billing/components/useBilling'
import PlansSection from './PlansSection'
import SubscriptionCard from './SubscriptionCard'
import InvoiceHistory from './InvoiceHistory'
import CancelDialog from './CancelDialog'
import ChangePlanDialog from './ChangePlanDialog'

export default function PricingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { subscription, planId, isLoading, refreshBilling } = useBilling()

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
      <div className="flex items-center justify-center py-16">
        <div className="text-(--text-muted)">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
      {/* Page header */}
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="w-5 h-5 text-(--text-muted)" aria-hidden="true" />
        <h1 className="text-xl font-bold text-(--text-primary)">Pricing & Billing</h1>
      </div>

      {/* Checkout success banner */}
      {checkoutSuccess && (
        <div
          className="bg-(--success)/10 border border-(--success)/20 text-(--success) px-4 py-3 rounded-lg mb-6 text-center text-sm font-medium"
          role="status"
        >
          {subscription
            ? `Welcome to ${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}!`
            : 'Processing your subscription...'}
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
