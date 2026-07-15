import type { ReactNode } from 'react'

export type ViewportPageWidth = 'narrow' | 'standard' | 'wide' | 'full'
export type ViewportPageScroll = 'internal' | 'managed'

export interface ViewportPageProps {
  ariaLabel: string
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  width?: ViewportPageWidth
  scroll?: ViewportPageScroll
  padded?: boolean
}

const paddedWidthClasses: Record<ViewportPageWidth, string> = {
  narrow: 'mc-page mc-page--narrow',
  standard: 'mc-page',
  wide: 'mc-page mc-page--wide',
  full: 'mc-page !max-w-none',
}

const unpaddedWidthClasses: Record<ViewportPageWidth, string> = {
  narrow: 'mx-auto w-full max-w-[var(--mc-content-narrow)]',
  standard: 'mx-auto w-full max-w-[var(--mc-content-standard)]',
  wide: 'mx-auto w-full max-w-[var(--mc-content-wide)]',
  full: 'w-full max-w-none',
}

/**
 * A page constrained to the visible area between MatchHeader and navigation.
 *
 * `internal` makes the content region the scroll owner. `managed` keeps it
 * overflow-hidden so a feature such as chat can manage nested scroll itself.
 */
export default function ViewportPage({
  ariaLabel,
  children,
  header,
  footer,
  width = 'full',
  scroll = 'internal',
  padded = false,
}: ViewportPageProps) {
  const contentWidthClasses = padded
    ? paddedWidthClasses[width]
    : unpaddedWidthClasses[width]
  const scrollClasses =
    scroll === 'internal'
      ? 'mc-scroll-region flex-1'
      : 'min-h-0 flex-1 overflow-hidden'

  return (
    <section
      aria-label={ariaLabel}
      className="flex h-[calc(100dvh-var(--mc-header-height)-var(--mc-safe-top)-var(--mc-bottom-nav-height)-var(--mc-safe-bottom))] min-h-0 min-w-0 flex-col overflow-hidden bg-(--bg-primary) md:h-[calc(100dvh-var(--mc-header-height)-var(--mc-safe-top))]"
    >
      {header && (
        <header className="shrink-0 border-b border-(--border-subtle) bg-(--bg-surface)">
          <div className="mc-page !max-w-none py-3">{header}</div>
        </header>
      )}

      <div className={scrollClasses}>
        <div
          className={`${contentWidthClasses} ${padded ? 'py-4 md:py-6' : ''} ${scroll === 'managed' ? 'h-full min-h-0' : ''}`}
        >
          {children}
        </div>
      </div>

      {footer && (
        <footer className="shrink-0 border-t border-(--border-subtle) bg-(--bg-surface)">
          <div className="mc-page !max-w-none py-3">{footer}</div>
        </footer>
      )}
    </section>
  )
}
