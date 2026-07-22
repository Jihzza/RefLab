import type { ReactNode } from 'react'

export type DocumentPageWidth = 'narrow' | 'standard' | 'wide' | 'full'
export type DocumentPageSpacing = 'compact' | 'standard' | 'spacious'

export interface DocumentPageProps {
  ariaLabel: string
  children: ReactNode
  title?: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  width?: DocumentPageWidth
  spacing?: DocumentPageSpacing
}

const widthClasses: Record<DocumentPageWidth, string> = {
  narrow: 'mc-page mc-page--narrow',
  standard: 'mc-page',
  wide: 'mc-page mc-page--wide',
  full: 'mc-page !max-w-none',
}

const spacingClasses: Record<DocumentPageSpacing, string> = {
  compact: 'py-3 md:py-4',
  standard: 'py-4 md:py-6 xl:py-8',
  spacious: 'py-6 md:py-8 xl:py-10',
}

/**
 * A document-flow page for dashboards, forms and long reading surfaces.
 *
 * Scrolling remains on the browser document. AppShell owns every fixed-shell
 * inset (header, rail, mobile navigation and safe areas), so this component
 * deliberately adds no second viewport height or navigation clearance.
 */
export default function DocumentPage({
  ariaLabel,
  children,
  title,
  eyebrow,
  description,
  actions,
  width = 'standard',
  spacing = 'standard',
}: DocumentPageProps) {
  const hasHeading = title || eyebrow || description || actions

  return (
    <section
      aria-label={ariaLabel}
      className="min-h-0 min-w-0 bg-(--bg-primary)"
    >
      <div className={`${widthClasses[width]} ${spacingClasses[spacing]}`}>
        {hasHeading && (
          <header className="mb-5 flex flex-col gap-4 border-b border-(--border-subtle) pb-5 sm:flex-row sm:items-end sm:justify-between md:mb-6 md:pb-6">
            <div className="min-w-0 max-w-3xl">
              {eyebrow && <p className="mc-eyebrow mb-2">{eyebrow}</p>}
              {title && <h1 className="mc-page-title">{title}</h1>}
              {description && (
                <div className="mt-2 text-sm leading-6 text-(--text-secondary)">
                  {description}
                </div>
              )}
            </div>

            {actions && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {actions}
              </div>
            )}
          </header>
        )}

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}
