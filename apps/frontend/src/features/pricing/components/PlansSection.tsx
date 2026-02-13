import { useState } from 'react'
import { Check } from 'lucide-react'
import { useBilling } from '@/features/billing/components/useBilling'
import { createCheckoutSession } from '@/features/billing/api/billingApi'
import type { PlanId } from '@/features/billing/types'
import type { PlanConfig } from '../types'

/** Plan definitions with correct prices */
const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'Free',
    pricePerMonth: 0,
    period: '',
    benefits: [
      'Access to basic Laws of the Game content',
      'Limited practice quizzes',
      'Community forum access',
      'Weekly newsletter',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€4.99',
    pricePerMonth: 4.99,
    period: '/ month',
    isHighlighted: true,
    benefits: [
      'Everything in Free',
      'Full video scenario library',
      'AI-powered feedback on decisions',
      'Personalized training plans',
      'Progress tracking & analytics',
      'Priority support',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '€9.99',
    pricePerMonth: 9.99,
    period: '/ month',
    benefits: [
      'Everything in Pro',
      'Advanced analytics insights',
      'Priority support + faster response',
      'Early access to new premium features',
    ],
  },
]

interface PlansSectionProps {
  onChangePlan: (targetPlan: 'pro' | 'plus') => void
}

export default function PlansSection({ onChangePlan }: PlansSectionProps) {
  const { planId: currentPlan, subscription, isLoading: billingLoading } = useBilling()
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isCancelPending = subscription?.cancel_at_period_end === true

  /** Subscribe to a paid plan (for free users) */
  const handleSubscribe = async (plan: Exclude<PlanId, 'free'>) => {
    setLoadingPlan(plan)
    setError(null)

    const { url, error: checkoutError } = await createCheckoutSession(plan)

    if (checkoutError || !url) {
      setError(checkoutError?.message || 'Failed to start checkout')
      setLoadingPlan(null)
      return
    }

    window.location.assign(url)
  }

  /** Get the button config for each plan card */
  const getButtonConfig = (plan: PlanConfig) => {
    const isCurrentPlan = currentPlan === plan.id

    // Free plan card
    if (plan.id === 'free') {
      return {
        label: isCurrentPlan ? 'Current Plan' : 'Free Forever',
        disabled: true,
        onClick: () => {},
        className: 'bg-(--bg-surface-2) text-(--text-muted) cursor-not-allowed',
      }
    }

    // Current paid plan
    if (isCurrentPlan) {
      return {
        label: isCancelPending ? 'Cancellation Pending' : 'Current Plan',
        disabled: true,
        onClick: () => {},
        className: 'bg-(--brand-yellow)/20 text-(--brand-yellow) cursor-not-allowed',
      }
    }

    // Free user looking at a paid plan
    if (currentPlan === 'free') {
      return {
        label: loadingPlan === plan.id ? 'Redirecting...' : 'Subscribe',
        disabled: billingLoading || loadingPlan !== null,
        onClick: () => handleSubscribe(plan.id as Exclude<PlanId, 'free'>),
        className: plan.isHighlighted
          ? 'bg-(--brand-yellow) text-(--bg-primary) hover:bg-(--brand-yellow-soft)'
          : 'bg-(--bg-surface-2) text-(--text-primary) hover:bg-(--bg-surface-2)/80 border border-(--border-subtle)',
      }
    }

    // Paid user looking at a different paid plan
    return {
      label: isCancelPending ? 'Resubscribe Required' : `Switch to ${plan.name}`,
      disabled: isCancelPending || billingLoading,
      onClick: () => onChangePlan(plan.id as 'pro' | 'plus'),
      className: plan.isHighlighted
        ? 'bg-(--brand-yellow) text-(--bg-primary) hover:bg-(--brand-yellow-soft)'
        : 'bg-(--bg-surface-2) text-(--text-primary) hover:bg-(--bg-surface-2)/80 border border-(--border-subtle)',
    }
  }

  return (
    <section className="mb-6" aria-label="Available plans">
      <h2 className="text-lg font-semibold text-(--text-primary) mb-1">Choose Your Plan</h2>
      <p className="text-sm text-(--text-muted) mb-4">
        Upgrade to unlock advanced training tools and AI-powered feedback.
      </p>

      {error && (
        <div
          className="bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm px-4 py-3 rounded-lg mb-4 text-center"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const btn = getButtonConfig(plan)

          return (
            <div
              key={plan.id}
              className={`relative rounded-(--radius-card) p-5 flex flex-col ${
                plan.isHighlighted
                  ? 'border-2 border-(--brand-yellow) bg-(--bg-surface)'
                  : 'border border-(--border-subtle) bg-(--bg-surface)'
              }`}
            >
              {/* Recommended badge */}
              {plan.isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-(--brand-yellow) text-(--bg-primary) text-xs font-bold px-3 py-1 rounded-full">
                  Recommended
                </div>
              )}

              <h3 className="text-lg font-bold text-(--text-primary) mb-1">{plan.name}</h3>

              <div className="mb-4">
                <span className="text-2xl font-bold text-(--text-primary)">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-(--text-muted) ml-1">{plan.period}</span>
                )}
              </div>

              {/* Benefits list */}
              <ul className="space-y-2 mb-5 grow" aria-label={`${plan.name} plan benefits`}>
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-(--text-secondary)">
                    <Check className="w-4 h-4 text-(--success) shrink-0 mt-0.5" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* Action button */}
              <button
                onClick={btn.onClick}
                disabled={btn.disabled}
                aria-label={`${btn.label} - ${plan.name} plan`}
                className={`w-full py-2.5 rounded-(--radius-button) text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${btn.className}`}
              >
                {btn.label}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
