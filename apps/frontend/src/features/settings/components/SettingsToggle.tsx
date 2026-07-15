import { Lock } from 'lucide-react'
import Switch from '@/components/ui/Switch'

interface SettingsToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
  /** When true, shows a lock icon and disables interaction. */
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
  const labelContent = locked ? (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      <Lock className="size-3.5 text-(--mc-color-text-muted)" aria-hidden="true" />
      {lockTooltip && <span className="sr-only">{lockTooltip}</span>}
    </span>
  ) : label

  return (
    <div className="px-4 py-3.5 sm:px-5">
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        label={labelContent}
        description={description}
        labelPosition="start"
        disabled={disabled || locked}
        containerClassName="w-full"
      />
    </div>
  )
}
