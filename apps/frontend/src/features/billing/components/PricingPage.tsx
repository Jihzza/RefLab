import { useState } from 'react'
import { useBilling } from './useBilling'
import { createCheckoutSession } from '../api/billingApi'
import type { PlanId, BillingInterval } from '../types'

interface PlanConfig {
  id: PlanId
  name: string
  monthlyPrice: number // EUR
  yearlyPrice: number  // EUR
  benefits: string[]
  isHighlighted?: boolean
}

const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
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
    monthlyPrice: 9,
    yearlyPrice: 99,
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
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 49,
    yearlyPrice: 499,
    benefits: [
      'Everything in Pro',
      'Team management dashboard',
      'Custom training programs',
      'API access for integrations',
      'Dedicated account manager',
      'SLA guarantees',
    ],
  },
]

export default function PricingPage() {
  const { planId: currentPlan, isLoading: billingLoading } = useBilling()
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (planId: Exclude<PlanId, 'free'>) => {
    setLoadingPlan(planId)
    setError(null)

    const { url, error: checkoutError } = await createCheckoutSession(planId, interval)

    if (checkoutError || !url) {
      setError(checkoutError?.message || 'Failed to start checkout')
      setLoadingPlan(null)
      return
    }

    // Redirect to Stripe Checkout
    window.location.href = url
  }

  const yearlyDiscount = (plan: PlanConfig) => {
    if (plan.monthlyPrice === 0) return 0
    const yearlyEquivalent = plan.monthlyPrice * 12
    return Math.round(((yearlyEquivalent - plan.yearlyPrice) / yearlyEquivalent) * 100)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-(--text-primary) text-center mb-2">
        Choose Your Plan
      </h1>
      <p className="text-(--text-muted) text-center mb-8">
        Upgrade to unlock advanced training tools and AI-powered feedback.
      </p>

      {/* Monthly/Yearly Toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setInterval('monthly')}
          className={`px-4 py-2 rounded-(--radius-button) text-sm font-medium transition-colors ${
            interval === 'monthly'
              ? 'bg-(--brand-yellow) text-(--bg-primary)'
              : 'bg-(--bg-surface-2) text-(--text-secondary) hover:text-(--text-primary)'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval('yearly')}
          className={`px-4 py-2 rounded-(--radius-button) text-sm font-medium transition-colors ${
            interval === 'yearly'
              ? 'bg-(--brand-yellow) text-(--bg-primary)'
              : 'bg-(--bg-surface-2) text-(--text-secondary) hover:text-(--text-primary)'
          }`}
        >
          Yearly
        </button>
      </div>

      {error && (
        <div className="bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm px-4 py-3 rounded-lg mb-6 text-center">
          {error}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const price = interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
          const isCurrentPlan = currentPlan === plan.id
          const discount = interval === 'yearly' ? yearlyDiscount(plan) : 0

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl p-6 flex flex-col ${
                plan.isHighlighted
                  ? 'border-2 border-(--brand-yellow) bg-(--bg-surface)'
                  : 'border border-(--border-subtle) bg-(--bg-surface)'
              }`}
            >
              {plan.isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-(--brand-yellow) text-(--bg-primary) text-xs font-bold px-3 py-1 rounded-full">
                  Recommended
                </div>
              )}

              <h2 className="text-lg font-bold text-(--text-primary) mb-1">{plan.name}</h2>

              <div className="mb-4">
                <span className="text-3xl font-bold text-(--text-primary)">
                  {price === 0 ? 'Free' : `€${price}`}
                </span>
                {price > 0 && (
                  <span className="text-(--text-muted) text-sm ml-1">
                    /{interval === 'monthly' ? 'mo' : 'yr'}
                  </span>
                )}
                {discount > 0 && (
                  <span className="ml-2 text-xs font-semibold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                    Save {discount}%
                  </span>
                )}
              </div>

              <ul className="space-y-2 mb-6 grow">
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-(--text-secondary)">
                    <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>

              {plan.id === 'free' ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-(--radius-button) text-sm font-medium bg-(--bg-surface-2) text-(--text-muted) cursor-not-allowed"
                >
                  {isCurrentPlan ? 'Current Plan' : 'Free Forever'}
                </button>
              ) : isCurrentPlan ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-(--radius-button) text-sm font-medium bg-(--brand-yellow)/20 text-(--brand-yellow) cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id as Exclude<PlanId, 'free'>)}
                  disabled={billingLoading || loadingPlan !== null}
                  className={`w-full py-2.5 rounded-(--radius-button) text-sm font-bold transition-colors ${
                    plan.isHighlighted
                      ? 'bg-(--brand-yellow) text-(--bg-primary) hover:bg-(--brand-yellow-soft)'
                      : 'bg-(--bg-surface-2) text-(--text-primary) hover:bg-(--bg-surface-2)/80 border border-(--border-subtle)'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loadingPlan === plan.id ? 'Redirecting...' : 'Subscribe'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
