import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import ProgressBar, { type ProgressBarTone } from '@/components/ui/ProgressBar'
import Surface from '@/components/ui/Surface'

interface StatCardProps {
  label: string
  value: number | string | null
  suffix?: string
  subtext?: string
  showBar?: boolean
  barPercent?: number
  emptyText?: string
  icon?: ReactNode
  tone?: ProgressBarTone
  className?: string
}

const valueToneClasses: Record<ProgressBarTone, string> = {
  accent: 'text-(--mc-color-accent)',
  success: 'text-(--mc-color-success)',
  warning: 'text-(--mc-color-warning)',
  danger: 'text-(--mc-color-danger)',
  info: 'text-(--mc-color-info)',
  muted: 'text-(--mc-color-text)',
}

export default function StatCard({
  label,
  value,
  suffix = '',
  subtext,
  showBar = false,
  barPercent = 0,
  emptyText = 'No data yet',
  icon,
  tone = 'muted',
  className = '',
}: StatCardProps) {
  const { i18n } = useTranslation()
  const hasValue = value !== null

  return (
    <Surface
      padding="sm"
      className={`flex min-h-[112px] flex-col border-(--mc-color-border-strong) shadow-none ${className}`}
    >
      <div className="flex min-w-0 items-start gap-2 text-(--mc-color-text-muted)">
        {icon && <span className="mt-0.5 shrink-0 text-(--mc-color-accent)" aria-hidden="true">{icon}</span>}
        <h3 className="line-clamp-2 text-[10px] font-bold uppercase leading-4 tracking-[0.08em] text-(--mc-color-text-secondary)">
          {label}
        </h3>
      </div>

      {hasValue ? (
        <div className="mt-auto pt-2">
          <p className={`text-2xl font-extrabold leading-none tracking-[-0.035em] tabular-nums ${valueToneClasses[tone]}`}>
            {typeof value === 'number' ? formatNumber(value, i18n.resolvedLanguage) : value}
            {suffix && <span className="ml-0.5 text-sm font-semibold text-(--mc-color-text-muted)">{suffix}</span>}
          </p>

          {showBar && (
            <ProgressBar
              value={barPercent}
              tone={tone}
              size="sm"
              className="mt-2"
              aria-label={`${label}: ${barPercent}%`}
            />
          )}

          {subtext && <p className="mt-1.5 truncate text-[10px] text-(--mc-color-text-muted)">{subtext}</p>}
        </div>
      ) : (
        <p className="mt-auto pt-3 text-xs leading-4 text-(--mc-color-text-muted)">{emptyText}</p>
      )}
    </Surface>
  )
}

function formatNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale ?? 'pt-PT', { maximumFractionDigits: 1 }).format(value)
}
