import { Lock } from 'lucide-react'
import Switch from '@/components/ui/Switch'

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
    <div className="px-4 py-3.5 sm:px-5">
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={isDisabled}
        labelPosition="start"
        label={(
          <span className="flex items-center gap-1.5">
            {label}
            {locked && (
              <span title={lockTooltip}>
                <Lock className="size-3.5 text-(--mc-color-text-muted)" aria-label={lockTooltip} />
              </span>
            )}
          </span>
        )}
        description={description}
      />
    </div>
  )
}
