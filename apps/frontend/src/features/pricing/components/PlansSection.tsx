import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useBilling } from '@/features/billing/components/useBilling'
import { createCheckoutSession } from '@/features/billing/api/billingApi'
import type { PlanId } from '@/features/billing/types'
import type { PlanConfig } from '../types'
import { useTranslation } from 'react-i18next'

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

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'

interface PlansSectionProps {
  onChangePlan: (targetPlan: 'pro' | 'plus') => void
}

export default function PlansSection({ onChangePlan }: PlansSectionProps) {
  const { t } = useTranslation()
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
  const getButtonConfig = (
    plan: PlanConfig,
  ): {
    label: string
    disabled: boolean
    onClick: () => void
    variant: Variant
    loading?: boolean
  } => {
    const isCurrentPlan = currentPlan === plan.id

    // Free plan card
    if (plan.id === 'free') {
      return {
        label: isCurrentPlan ? t('Current Plan') : t('Free Forever'),
        disabled: true,
        onClick: () => {},
        variant: 'secondary',
      }
    }

    // Current paid plan
    if (isCurrentPlan) {
      return {
        label: isCancelPending ? t('Cancellation Pending') : t('Current Plan'),
        disabled: true,
        onClick: () => {},
        variant: 'outline',
      }
    }

    // Free user looking at a paid plan
    if (currentPlan === 'free') {
      return {
        label: loadingPlan === plan.id ? t('Redirecting...') : t('Subscribe'),
        disabled: billingLoading || loadingPlan !== null,
        loading: loadingPlan === plan.id,
        onClick: () => handleSubscribe(plan.id as Exclude<PlanId, 'free'>),
        variant: plan.isHighlighted ? 'primary' : 'secondary',
      }
    }

    // Paid user looking at a different paid plan
    return {
      label: isCancelPending ? t('Resubscribe Required') : t('Switch to {{plan}}', { plan: plan.name }),
      disabled: isCancelPending || billingLoading,
      onClick: () => onChangePlan(plan.id as 'pro' | 'plus'),
      variant: plan.isHighlighted ? 'primary' : 'secondary',
    }
  }

  return (
    <section className="mb-8" aria-label={t('Choose Your Plan')}>
      <div className="mb-5">
        <span className="eyebrow">{t('Membership')}</span>
        <h2 className="text-lg font-bold text-(--text-primary) mt-1">{t('Choose Your Plan')}</h2>
        <p className="text-sm text-(--text-muted) mt-1">
          {t('Upgrade to unlock advanced training tools and AI-powered feedback.')}
        </p>
      </div>

      {error && (
        <div
          className="bg-(--error)/10 border border-(--error)/20 text-(--error) text-sm px-4 py-3 rounded-(--radius-button) mb-4 text-center"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-stretch">
        {PLANS.map((plan) => {
          const btn = getButtonConfig(plan)
          const isPro = plan.isHighlighted

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-(--radius-card) p-5 transition-transform duration-200 ${
                isPro
                  ? 'card-console glow-brand border border-(--brand-yellow)/40 md:-translate-y-2'
                  : 'card-console'
              }`}
            >
              {/* Diagonal referee-flag accent strip for the recommended plan */}
              {isPro && (
                <span
                  className="flag-accent absolute inset-x-0 top-0 h-1 rounded-t-(--radius-card)"
                  aria-hidden="true"
                />
              )}

              {/* Recommended badge */}
              {isPro && (
                <div
                  className="numeral absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-(--bg-primary) text-[11px] font-bold px-3 py-1 rounded-(--radius-pill) shadow-[0_6px_16px_-6px_rgba(246,194,28,0.7)]"
                  style={{ backgroundImage: 'var(--grad-brand)' }}
                >
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  {t('Recommended')}
                </div>
              )}

              <h3
                className={`text-base font-bold mb-2 ${
                  isPro ? 'text-gradient-brand' : 'text-(--text-primary)'
                }`}
              >
                {t(plan.name)}
              </h3>

              {/* Price */}
              <div className="mb-5 flex items-baseline gap-1">
                <span className="numeral text-3xl font-extrabold text-(--text-primary)">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-(--text-muted)">{plan.period}</span>
                )}
              </div>

              {/* Benefits list */}
              <ul className="space-y-2.5 mb-6 grow" aria-label={`${plan.name} plan benefits`}>
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm text-(--text-secondary)">
                    <span
                      className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full ${
                        isPro ? 'bg-(--brand-yellow)/20' : 'bg-(--success)/15'
                      }`}
                      aria-hidden="true"
                    >
                      <Check
                        className={`w-3 h-3 ${isPro ? 'text-(--brand-yellow)' : 'text-(--success)'}`}
                        strokeWidth={3}
                      />
                    </span>
                    {t(benefit)}
                  </li>
                ))}
              </ul>

              {/* Action button */}
              <Button
                variant={btn.variant}
                size="md"
                fullWidth
                loading={btn.loading}
                disabled={btn.disabled}
                onClick={btn.onClick}
                aria-label={`${btn.label} - ${plan.name} plan`}
              >
                {btn.label}
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
