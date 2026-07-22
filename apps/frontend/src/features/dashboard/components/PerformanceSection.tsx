import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Surface from '@/components/ui/Surface'
import type { PerformanceStats, ProgressStats } from '../types'

interface PerformanceSectionProps {
  performance: PerformanceStats
  progress: ProgressStats
}

export default function PerformanceSection({ performance, progress }: PerformanceSectionProps) {
  const { t, i18n } = useTranslation()
  const accuracy = performance.overall_accuracy
  const delta = progress.accuracy_change
  const deltaTone = delta === null || delta === 0 ? 'text-(--mc-color-text-muted)' : delta > 0 ? 'text-(--mc-color-success)' : 'text-(--mc-color-danger)'
  const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <Surface
      padding="none"
      className="relative min-h-[190px] overflow-hidden border-(--mc-color-border-strong) shadow-none"
      role="region"
      aria-label={t('Performance metrics')}
    >
      <PitchDiagram />

      <div className="relative z-10 flex min-h-[190px] max-w-[68%] flex-col justify-center px-5 py-5 sm:max-w-[60%] sm:px-6">
        <p className="text-sm text-(--mc-color-text-secondary)">{t('Overall Accuracy')}</p>

        {accuracy !== null ? (
          <p className="mt-1 text-[58px] font-extrabold leading-none tracking-[-0.055em] text-(--mc-color-accent) sm:text-[68px]">
            {formatNumber(accuracy, i18n.resolvedLanguage)}<span className="text-[0.72em]">%</span>
          </p>
        ) : (
          <div className="mt-3">
            <p className="text-4xl font-extrabold text-(--mc-color-text-muted)">—</p>
            <p className="mt-2 max-w-xs text-xs leading-5 text-(--mc-color-text-muted)">
              {t('Complete your first test to see accuracy')}
            </p>
          </div>
        )}

        <div className="mt-3 flex min-h-5 items-center gap-1.5 text-sm">
          <DeltaIcon className={`size-4 ${deltaTone}`} aria-hidden="true" />
          <span className={`font-semibold tabular-nums ${deltaTone}`}>
            {delta === null ? '—' : `${delta > 0 ? '+' : ''}${formatNumber(delta, i18n.resolvedLanguage)}%`}
          </span>
          <span className="text-(--mc-color-text-muted)">{t('this week')}</span>
        </div>

        {(progress.accuracy_this_week !== null || progress.accuracy_last_week !== null) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-(--mc-color-text-muted)">
            {progress.accuracy_this_week !== null && (
              <span>{t('Current')} {formatNumber(progress.accuracy_this_week, i18n.resolvedLanguage)}%</span>
            )}
            {progress.accuracy_last_week !== null && (
              <span>{t('Previous')} {formatNumber(progress.accuracy_last_week, i18n.resolvedLanguage)}%</span>
            )}
          </div>
        )}
      </div>
    </Surface>
  )
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 240 170"
      className="pointer-events-none absolute -right-7 top-2 h-[96%] w-[58%] text-(--mc-color-border-strong) opacity-80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M49 8 229 24 209 158 13 126Z" />
      <path d="m128 15-9 127" />
      <ellipse cx="122" cy="78" rx="25" ry="19" transform="rotate(-5 122 78)" />
      <path d="M42 55 17 52M39 87 14 82M201 60l24 3M196 105l23 5" />
      <path d="m46 43-26-3-5 51 25 6M204 47l23 3-8 72-25-6" />
      <path d="M78 11 60 132M176 19l-14 130" opacity=".55" />
    </svg>
  )
}

function formatNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale ?? 'pt-PT', { maximumFractionDigits: 1 }).format(value)
}
