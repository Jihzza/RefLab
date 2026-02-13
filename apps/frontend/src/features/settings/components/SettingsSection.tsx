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
    <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3 border-b border-(--border-subtle)">
        <div className="flex items-center gap-2">
          {icon && <span className="text-(--text-muted)">{icon}</span>}
          <h2 className="text-base font-semibold text-(--text-primary)">{title}</h2>
        </div>
        {description && (
          <p className="text-xs text-(--text-muted) mt-1">{description}</p>
        )}
      </div>

      {/* Section content with dividers between children */}
      <div className="divide-y divide-(--border-subtle)">
        {children}
      </div>
    </div>
  )
}
