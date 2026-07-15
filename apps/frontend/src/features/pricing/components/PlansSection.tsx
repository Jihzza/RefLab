import { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, SegmentedControl, Surface } from '@/components/ui'
import { createCheckoutSession } from '@/features/billing/api/billingApi'
import { useBilling } from '@/features/billing/components/useBilling'
import type { PlanId } from '@/features/billing/types'
import type { PlanConfig } from '../types'

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
  const { t, i18n } = useTranslation()
  const { planId: currentPlan, subscription, isLoading: billingLoading } = useBilling()
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(() => (
    currentPlan === 'free' ? 'pro' : currentPlan
  ))
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isCancelPending = subscription?.cancel_at_period_end === true
  const plan = PLANS.find((candidate) => candidate.id === selectedPlan) ?? PLANS[1]

  const handleSubscribe = async (target: Exclude<PlanId, 'free'>) => {
    if (loadingPlan) return
    setLoadingPlan(target)
    setError(null)

    try {
      const { url, error: checkoutError } = await createCheckoutSession(target)
      if (checkoutError || !url) throw checkoutError || new Error('Missing checkout URL')
      window.location.assign(url)
    } catch (checkoutError) {
      console.error('Failed to start checkout:', checkoutError)
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : t('Failed to start checkout'),
      )
      setLoadingPlan(null)
    }
  }

  const action = getPlanAction({
    plan,
    currentPlan,
    isCancelPending,
    billingLoading,
    loadingPlan,
    t,
    onSubscribe: handleSubscribe,
    onChangePlan,
  })

  return (
    <section aria-labelledby="plans-title" className="space-y-4">
      <div className="mc-visually-hidden">
        <h2 id="plans-title">{t('Choose Your Plan')}</h2>
      </div>

      <SegmentedControl
        ariaLabel={t('Choose Your Plan')}
        options={PLANS.map((candidate) => ({
          value: candidate.id,
          label: t(candidate.name),
        }))}
        value={selectedPlan}
        onValueChange={(value) => {
          setSelectedPlan(value as PlanId)
          setError(null)
        }}
        fullWidth
        optionClassName="min-h-12 text-base aria-checked:bg-(--mc-color-accent) aria-checked:text-(--mc-color-canvas)"
      />

      {error && (
        <div
          className="flex items-start gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/8 px-4 py-3 text-sm text-(--mc-color-danger)"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">{error}</span>
        </div>
      )}

      <Surface
        padding="none"
        className={`relative mx-auto w-full max-w-3xl overflow-hidden shadow-none ${
          plan.isHighlighted
            ? 'border-(--mc-color-accent) ring-1 ring-(--mc-color-accent)/25'
            : 'border-(--mc-color-border-strong)'
        }`}
        aria-labelledby={`plan-${plan.id}-title`}
      >
        <PitchDiagram />
        <div className="relative z-10 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mc-eyebrow mb-1">{t('Plan')}</p>
              <h3
                id={`plan-${plan.id}-title`}
                className="text-[32px] font-extrabold leading-none tracking-[-0.04em] text-(--mc-color-text) sm:text-4xl"
              >
                {t(plan.name)}
              </h3>
            </div>
            {plan.isHighlighted && (
              <span className="rounded-(--mc-radius-compact) bg-(--mc-color-accent) px-3 py-2 text-xs font-extrabold text-(--mc-color-canvas) sm:text-sm">
                {t('Recommended')}
              </span>
            )}
          </div>

          <div className="mt-6 flex items-end gap-2">
            <span className="text-[48px] font-extrabold leading-none tracking-[-0.055em] tabular-nums text-(--mc-color-accent) sm:text-6xl">
              {plan.pricePerMonth > 0
                ? new Intl.NumberFormat(i18n.language || 'pt-PT', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2,
                  }).format(plan.pricePerMonth)
                : t(plan.price)}
            </span>
            {plan.period && (
              <span className="pb-1 text-base text-(--mc-color-text-secondary) sm:text-lg">
                {t(plan.period)}
              </span>
            )}
          </div>

          <div className="my-6 h-px bg-(--mc-color-border)" />

          <ul className="space-y-3" aria-label={t('{{plan}} plan benefits', { plan: t(plan.name) })}>
            {plan.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-(--mc-color-text-secondary) sm:text-base">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-(--mc-color-success)" aria-hidden="true" />
                <span>{t(benefit)}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-7 overflow-hidden rounded-(--mc-radius-button)">
            <Button
              fullWidth
              size="lg"
              variant={plan.isHighlighted ? 'primary' : 'secondary'}
              onClick={action.onClick}
              disabled={action.disabled}
              loading={action.loading}
              loadingText={action.label}
              className="rounded-none pr-14"
              aria-label={t('{{action}} — {{plan}} plan', {
                action: action.label,
                plan: t(plan.name),
              })}
            >
              {action.label}
            </Button>
            <span
              className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger)"
              aria-hidden="true"
            />
          </div>
        </div>
      </Surface>
    </section>
  )
}

interface PlanActionOptions {
  plan: PlanConfig
  currentPlan: PlanId
  isCancelPending: boolean
  billingLoading: boolean
  loadingPlan: PlanId | null
  t: (key: string, options?: Record<string, unknown>) => string
  onSubscribe: (plan: Exclude<PlanId, 'free'>) => Promise<void>
  onChangePlan: (plan: 'pro' | 'plus') => void
}

function getPlanAction({
  plan,
  currentPlan,
  isCancelPending,
  billingLoading,
  loadingPlan,
  t,
  onSubscribe,
  onChangePlan,
}: PlanActionOptions) {
  if (plan.id === 'free') {
    return {
      label: currentPlan === 'free' ? t('Current Plan') : t('Included with your plan'),
      disabled: true,
      loading: false,
      onClick: () => undefined,
    }
  }

  if (currentPlan === plan.id) {
    return {
      label: isCancelPending ? t('Cancellation Pending') : t('Current Plan'),
      disabled: true,
      loading: false,
      onClick: () => undefined,
    }
  }

  if (currentPlan === 'free') {
    return {
      label: loadingPlan === plan.id ? t('Redirecting...') : t('Subscribe'),
      disabled: billingLoading || loadingPlan !== null,
      loading: loadingPlan === plan.id,
      onClick: () => void onSubscribe(plan.id as Exclude<PlanId, 'free'>),
    }
  }

  return {
    label: isCancelPending
      ? t('Resubscribe Required')
      : t('Switch to {{plan}}', { plan: plan.name }),
    disabled: isCancelPending || billingLoading,
    loading: false,
    onClick: () => onChangePlan(plan.id as 'pro' | 'plus'),
  }
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 280 210"
      className="pointer-events-none absolute -right-12 top-0 h-56 w-72 text-(--mc-color-border-strong) opacity-55"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M49 8 269 28 244 196 13 151Z" />
      <path d="m151 18-13 157" />
      <ellipse cx="145" cy="96" rx="31" ry="24" transform="rotate(-6 145 96)" />
      <path d="m46 55-29-4-6 64 28 8M239 63l30 4-10 88-30-8" />
    </svg>
  )
}
