import { useId, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import Surface from '@/components/ui/Surface'

interface SettingsSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  description?: ReactNode
  status?: ReactNode
  defaultOpen?: boolean
  collapsible?: boolean
  grouped?: boolean
}

export default function SettingsSection({
  title,
  icon,
  children,
  description,
  status,
  defaultOpen = false,
  collapsible = true,
  grouped = false,
}: SettingsSectionProps) {
  const generatedId = useId()
  const headingId = `settings-${generatedId}-heading`
  const panelId = `settings-${generatedId}-panel`
  const [expanded, setExpanded] = useState(defaultOpen || !collapsible)

  const headingContent = (
    <>
      {icon && (
        <span
          className="flex size-10 shrink-0 items-center justify-center text-(--mc-color-accent)"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">
        <span
          id={headingId}
          className="block text-base font-semibold leading-6 text-(--mc-color-text) sm:text-[17px]"
        >
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-5 text-(--mc-color-text-muted) sm:text-sm">
            {description}
          </span>
        )}
      </span>
      {status && <span className="shrink-0">{status}</span>}
      {collapsible && (
        <ChevronRight
          className={`size-5 shrink-0 text-(--mc-color-text-muted) transition-transform duration-150 motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`}
          aria-hidden="true"
        />
      )}
    </>
  )

  const content = (
    <>
      <h2 className="m-0">
        {collapsible ? (
          <button
            type="button"
            className="flex min-h-[4.75rem] w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none sm:px-5"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((current) => !current)}
          >
            {headingContent}
          </button>
        ) : (
          <span className="flex min-h-[4.75rem] items-center gap-3 px-4 py-3.5 sm:px-5">
            {headingContent}
          </span>
        )}
      </h2>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        hidden={!expanded}
        className="divide-y divide-(--mc-color-border) border-t border-(--mc-color-border)"
      >
        {children}
      </div>
    </>
  )

  if (grouped) {
    return <section className="overflow-hidden">{content}</section>
  }

  return (
    <Surface
      padding="none"
      className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
    >
      {content}
    </Surface>
  )
}
