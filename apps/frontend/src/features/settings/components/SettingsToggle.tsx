import { Lock } from 'lucide-react'

interface SettingsToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
  /** When true, shows a lock icon and disables interaction */
  locked?: boolean
  lockTooltip?: string
}

export default function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  locked = false,
  lockTooltip,
}: SettingsToggleProps) {
  const isDisabled = disabled || locked

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-(--text-primary)">{label}</span>
          {locked && (
            <span title={lockTooltip}>
              <Lock className="w-3.5 h-3.5 text-(--text-muted)" aria-label={lockTooltip} />
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-(--text-muted) mt-0.5">{description}</p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle ${label}`}
        disabled={isDisabled}
        onClick={onChange}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-(--brand-yellow) focus:ring-offset-2 focus:ring-offset-(--bg-surface)
          ${checked ? 'bg-(--brand-yellow)' : 'bg-(--bg-surface-2) border border-(--border-subtle)'}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm
            transform transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  )
}
