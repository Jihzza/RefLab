import type { PlanId } from '../types'

interface PlanBadgeProps {
  planId: PlanId
  className?: string
}

const PLAN_STYLES: Record<PlanId, string> = {
  free: 'bg-gray-500/20 text-gray-400',
  pro: 'bg-(--brand-yellow)/20 text-(--brand-yellow)',
  enterprise: 'bg-purple-500/20 text-purple-400',
}

const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
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
