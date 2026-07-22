import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button, Skeleton, Surface } from '@/components/ui'

export function MatchAccent({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span className={`${compact ? 'h-4 w-1.5' : 'h-6 w-2'} -skew-x-[18deg] rounded-sm bg-(--mc-color-accent)`} />
      <span className={`${compact ? 'h-4 w-1.5' : 'h-6 w-2'} -skew-x-[18deg] rounded-sm bg-(--mc-color-danger)`} />
    </span>
  )
}

export function LearningSectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-(--mc-color-accent)">
            <MatchAccent compact />
            <span>{eyebrow}</span>
          </div>
        )}
        <h2 className="text-xl font-extrabold tracking-[-0.02em] text-(--mc-color-text) sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-(--mc-color-text-secondary)">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

export function LearningMetric({
  icon,
  label,
  value,
  loading = false,
  emptyText,
}: {
  icon: ReactNode
  label: ReactNode
  value: ReactNode
  loading?: boolean
  emptyText?: ReactNode
}) {
  const isEmpty = value === null || value === undefined || value === '—'

  return (
    <Surface className="min-h-28 overflow-hidden" padding="md">
      <div className="mb-3 flex items-center gap-2 text-(--mc-color-accent)">
        <span className="flex size-8 items-center justify-center rounded-lg border border-(--mc-color-accent)/25 bg-(--mc-color-accent)/10">
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--mc-color-text-muted)">
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton variant="text" width="60%" className="h-7" />
      ) : isEmpty ? (
        <p className="text-sm leading-5 text-(--mc-color-text-muted)">{emptyText ?? '—'}</p>
      ) : (
        <p className="mc-tabular text-2xl font-extrabold tracking-tight text-(--mc-color-text)">{value}</p>
      )}
    </Surface>
  )
}

export function LearningLoading({ label }: { label: ReactNode }) {
  return (
    <div className="space-y-4 py-3" role="status" aria-live="polite">
      <span className="mc-visually-hidden">{label}</span>
      <Skeleton height="4.75rem" />
      <Skeleton height="18rem" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </div>
    </div>
  )
}

export function LearningMessage({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <Surface className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center" variant="inset">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-accent)">
        {icon}
      </div>
      <h2 className="text-base font-bold text-(--mc-color-text)">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm leading-6 text-(--mc-color-text-muted)">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Surface>
  )
}

export function LearningError({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: ReactNode
  description?: ReactNode
  retryLabel?: ReactNode
  onRetry?: () => void
}) {
  return (
    <div role="alert">
      <LearningMessage
        icon={<AlertTriangle size={22} />}
        title={title}
        description={description}
        action={onRetry && retryLabel ? (
          <Button variant="secondary" leadingIcon={<RefreshCw size={16} />} onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : undefined}
      />
    </div>
  )
}

type LearningChoiceState = 'default' | 'selected' | 'correct' | 'incorrect' | 'muted'

const choiceStateClasses: Record<LearningChoiceState, string> = {
  default:
    'border-(--mc-color-border) bg-(--mc-color-canvas) text-(--mc-color-text-secondary) hover:border-(--mc-color-accent)/55 hover:bg-(--mc-color-surface-hover)',
  selected:
    'border-(--mc-color-accent) bg-(--mc-color-accent)/10 text-(--mc-color-text) ring-1 ring-(--mc-color-accent)/25',
  correct:
    'border-(--mc-color-success) bg-(--mc-color-success)/10 text-(--mc-color-text)',
  incorrect:
    'border-(--mc-color-danger) bg-(--mc-color-danger)/10 text-(--mc-color-text)',
  muted:
    'border-(--mc-color-border) bg-(--mc-color-canvas) text-(--mc-color-text-muted)',
}

interface LearningChoiceProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  marker: ReactNode
  state?: LearningChoiceState
  children: ReactNode
}

export function LearningChoice({
  marker,
  state = 'default',
  children,
  className = '',
  ...props
}: LearningChoiceProps) {
  return (
    <button
      type="button"
      className={`mc-focus-ring mc-interactive flex min-h-14 w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm leading-5 disabled:cursor-default ${choiceStateClasses[state]} ${className}`}
      {...props}
    >
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs font-extrabold ${
        state === 'selected'
          ? 'border-(--mc-color-accent) bg-(--mc-color-accent) text-(--mc-color-canvas)'
          : state === 'correct'
            ? 'border-(--mc-color-success) bg-(--mc-color-success) text-(--mc-color-canvas)'
            : state === 'incorrect'
              ? 'border-(--mc-color-danger) bg-(--mc-color-danger) text-(--mc-color-canvas)'
              : 'border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text)'
      }`}>
        {marker}
      </span>
      <span className="pt-1">{children}</span>
    </button>
  )
}
