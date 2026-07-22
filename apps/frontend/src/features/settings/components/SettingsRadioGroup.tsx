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
    <fieldset className="px-4 py-4 sm:px-5" disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold text-(--mc-color-text)">
        {label}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <label
              key={option.value}
              className={`
                relative flex min-h-20 cursor-pointer items-start gap-3 rounded-(--mc-radius-input) border p-3.5 transition-colors
                focus-within:ring-2 focus-within:ring-(--mc-color-focus)
                ${isSelected
                  ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/10'
                  : 'border-(--mc-color-border) bg-(--mc-color-surface-raised) hover:border-(--mc-color-border-strong) hover:bg-(--mc-color-surface-hover)'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {/* Custom radio circle */}
              <span
                className={`
                  mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2
                  flex items-center justify-center transition-colors
                  ${isSelected ? 'border-(--mc-color-accent)' : 'border-(--mc-color-border-strong)'}
                `}
              >
                {isSelected && (
                  <span className="size-2 rounded-full bg-(--mc-color-accent)" />
                )}
              </span>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-(--mc-color-text)">{option.label}</span>
                {option.description && (
                  <p className={`mt-1 text-xs leading-5 ${isSelected ? 'text-(--mc-color-text-secondary)' : 'text-(--mc-color-text-muted)'}`}>
                    {option.description}
                  </p>
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
