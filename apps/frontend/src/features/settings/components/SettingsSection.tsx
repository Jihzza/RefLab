import type { ReactNode } from 'react'

interface SettingsSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  description?: string
}

export default function SettingsSection({
  title,
  icon,
  children,
  description,
}: SettingsSectionProps) {
  return (
    <section className="overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) shadow-(--mc-shadow-soft)">
      <header className="flex items-start gap-3 border-b border-(--mc-color-border) px-4 py-4 sm:px-5">
        {icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-accent)">
            {icon}
          </span>
        )}
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-semibold leading-tight text-(--mc-color-text)">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-5 text-(--mc-color-text-muted)">{description}</p>
          )}
        </div>
      </header>

      <div className="divide-y divide-(--mc-color-border)">
        {children}
      </div>
    </section>
  )
}
