import { Check, LockKeyhole } from 'lucide-react'
import { useBilling } from '@/features/billing/components/useBilling'
import type { PlanConfig } from '../types'
import { useTranslation } from 'react-i18next'

/** Launch plan. Paid tiers return only after their entitlements are validated. */
const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'Free',
    pricePerMonth: 0,
    period: '',
    benefits: [
      'All available referee tests',
      'Practice questions by law and topic',
      'Video decision scenarios',
      'Progress dashboard',
      'Community and direct messages',
    ],
  },
]

export default function PlansSection() {
  const { t } = useTranslation()
  const { planId: currentPlan } = useBilling()

  return (
    <section className="mb-8" aria-label={t('Choose Your Plan')}>
      <div className="mb-5">
        <p className="mc-eyebrow mb-2">RefLab</p>
        <h2 className="text-xl font-bold text-(--mc-color-text)">{t('Choose Your Plan')}</h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm leading-6 text-(--mc-color-text-muted)">
        {t('All currently available training and community features are included in the launch plan.')}
      </p>

      <div
        className="mb-5 flex items-start gap-3 rounded-(--mc-radius-input) border border-(--mc-color-accent)/30 bg-(--mc-color-accent)/10 px-4 py-3 text-sm leading-6 text-(--mc-color-text-secondary)"
        role="note"
      >
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
        <span>{t('RefLab is launching free. Paid subscriptions are currently unavailable.')}</span>
      </div>

      <div className="grid max-w-md grid-cols-1 items-stretch gap-4">
        {PLANS.map((plan) => {
          const buttonLabel = currentPlan === plan.id ? t('Current Plan') : t('Free Forever')

          return (
            <div
              key={plan.id}
              className={`relative isolate flex min-h-full flex-col overflow-hidden rounded-(--mc-radius-card) p-5 shadow-(--mc-shadow-soft) ${
                plan.isHighlighted
                  ? 'border border-(--mc-color-accent) bg-(--mc-color-surface-raised)'
                  : 'border border-(--mc-color-border) bg-(--mc-color-surface)'
              }`}
            >
              <div
                className={`absolute right-0 top-0 h-20 w-20 -translate-y-10 translate-x-10 rotate-45 ${plan.isHighlighted ? 'bg-(--mc-color-accent)' : 'bg-(--mc-color-border)'}`}
                aria-hidden="true"
              />
              <div className="h-5" aria-hidden="true" />

              <h3 className="mt-1 text-lg font-bold text-(--mc-color-text)">{t(plan.name)}</h3>

              <div className="mb-5 mt-2 flex items-baseline">
                <span className="mc-tabular text-3xl font-extrabold tracking-tight text-(--mc-color-text)">
                  {plan.id === 'free' ? t('Free') : plan.price}
                </span>
                {plan.period && (
                  <span className="ml-1 text-xs text-(--mc-color-text-muted)">{plan.period}</span>
                )}
              </div>

              <ul className="space-y-2 mb-5 grow" aria-label={`${plan.name} plan benefits`}>
                {plan.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm leading-5 text-(--mc-color-text-secondary)">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-(--mc-color-success)/15 text-(--mc-color-success)">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    <span>{t(benefit)}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled
                aria-label={`${buttonLabel}: ${t(plan.name)}`}
                className="min-h-11 w-full cursor-not-allowed rounded-(--mc-radius-button) bg-(--bg-surface-2) px-4 py-2.5 text-sm font-bold text-(--text-muted) opacity-60"
              >
                {buttonLabel}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
