import { useId } from 'react'

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
  const generatedId = useId()
  const groupName = `settings-radio-${generatedId}`

  return (
    <fieldset className="px-4 py-4 sm:px-5" disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold text-(--mc-color-text-secondary)">
        {label}
      </legend>
      <div className="space-y-2.5">
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <label
              key={option.value}
              className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-(--mc-radius-input) border p-3.5 transition-[background-color,border-color,box-shadow] focus-within:ring-2 focus-within:ring-(--mc-color-focus) focus-within:ring-offset-1 focus-within:ring-offset-(--mc-color-canvas) motion-reduce:transition-none ${
                isSelected
                  ? 'border-(--mc-color-accent)/55 bg-(--mc-color-accent)/8'
                  : 'border-(--mc-color-border) bg-(--mc-color-canvas) hover:border-(--mc-color-border-strong) hover:bg-(--mc-color-surface-hover)'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="peer sr-only"
              />
              <span
                className={`mt-0.5 flex size-[1.125rem] shrink-0 items-center justify-center rounded-full border-2 transition-colors motion-reduce:transition-none ${
                  isSelected
                    ? 'border-(--mc-color-accent)'
                    : 'border-(--mc-color-border-strong)'
                }`}
                aria-hidden="true"
              >
                {isSelected && <span className="size-2 rounded-full bg-(--mc-color-accent)" />}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-(--mc-color-text)">
                  {option.label}
                </span>
                {option.description && (
                  <span className="mt-0.5 block text-xs leading-5 text-(--mc-color-text-muted)">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
