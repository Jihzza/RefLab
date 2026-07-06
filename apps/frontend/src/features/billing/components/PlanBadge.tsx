import type { PlanId } from '../types'

interface PlanBadgeProps {
  planId: PlanId
  className?: string
}

const PLAN_STYLES: Record<PlanId, string> = {
  free: 'bg-(--text-muted)/10 text-(--text-muted)',
  pro: 'bg-(--brand-yellow)/20 text-(--brand-yellow)',
  plus: 'bg-(--success)/20 text-(--success)',
}

const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
  plus: 'Plus',
}

export default function PlanBadge({ planId, className = '' }: PlanBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLAN_STYLES[planId]} ${className}`}
    >
      {PLAN_LABELS[planId]}
    </span>
  )
}
