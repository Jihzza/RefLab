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
    <div className="card-console overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3.5 border-b border-(--border-subtle) bg-(--bg-surface-2)/40">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-(--brand-yellow)/12 text-(--brand-yellow)">
              {icon}
            </span>
          )}
          <h2 className="eyebrow !text-(--text-secondary)">{title}</h2>
        </div>
        {description && (
          <p className="text-xs text-(--text-muted) mt-1.5">{description}</p>
        )}
      </div>

      {/* Section content with dividers between children */}
      <div className="divide-y divide-(--border-subtle)">
        {children}
      </div>
    </div>
  )
}
