import type { PlanId } from '../types'
import { useTranslation } from 'react-i18next'

interface PlanBadgeProps {
  planId: PlanId
  className?: string
}

const PLAN_STYLES: Record<PlanId, string> = {
  free: 'border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text-secondary)',
  pro: 'border-(--mc-color-accent)/35 bg-(--mc-color-accent)/15 text-(--mc-color-accent)',
  plus: 'border-(--mc-color-success)/35 bg-(--mc-color-success)/15 text-(--mc-color-success)',
}

const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
  plus: 'Plus',
}

export default function PlanBadge({ planId, className = '' }: PlanBadgeProps) {
  const { t } = useTranslation()

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-(--mc-radius-pill) border px-2 py-1 text-xs font-semibold leading-none ${PLAN_STYLES[planId]} ${className}`}
    >
      {t(PLAN_LABELS[planId])}
    </span>
  )
}
