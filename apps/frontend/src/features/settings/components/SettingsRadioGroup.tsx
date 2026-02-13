interface RadioOption<T extends string> {
  value: T
  label: string
  description?: string
}

interface SettingsRadioGroupProps<T extends string> {
  label: string
  options: RadioOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

export default function SettingsRadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: SettingsRadioGroupProps<T>) {
  return (
    <fieldset className="px-4 py-3" disabled={disabled}>
      <legend className="text-sm font-medium text-(--text-secondary) mb-2">
        {label}
      </legend>
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <label
              key={option.value}
              className={`
                flex items-start gap-3 p-3 rounded-(--radius-input) cursor-pointer
                transition-colors
                ${isSelected
                  ? 'bg-(--brand-yellow)/10 border border-(--brand-yellow)/30'
                  : 'bg-(--bg-surface-2) border border-(--border-subtle) hover:bg-(--bg-hover)'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* Custom radio circle */}
              <span
                className={`
                  mt-0.5 flex-shrink-0 w-4.5 h-4.5 rounded-full border-2
                  flex items-center justify-center transition-colors
                  ${isSelected ? 'border-(--brand-yellow)' : 'border-(--border-strong)'}
                `}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-(--brand-yellow)" />
                )}
              </span>

              <div className="flex-1 min-w-0">
                <span className="text-sm text-(--text-primary)">{option.label}</span>
                {option.description && (
                  <p className="text-xs text-(--text-muted) mt-0.5">{option.description}</p>
                )}
              </div>

              <input
                type="radio"
                name={label}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="sr-only"
              />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
