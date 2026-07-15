import type { ReactNode } from 'react'

export type SplitPaneMobilePane = 'primary' | 'secondary'
export type SplitPanePrimaryWidth = 'compact' | 'standard' | 'wide'
export type SplitPaneScroll = 'internal' | 'managed'

export interface SplitPanePageProps {
  ariaLabel: string
  primaryLabel: string
  secondaryLabel: string
  primary: ReactNode
  secondary: ReactNode
  mobilePane?: SplitPaneMobilePane
  primaryWidth?: SplitPanePrimaryWidth
  primaryScroll?: SplitPaneScroll
  secondaryScroll?: SplitPaneScroll
}

const primaryWidthClasses: Record<SplitPanePrimaryWidth, string> = {
  compact: 'md:w-72 lg:w-80',
  standard: 'md:w-80 lg:w-96',
  wide: 'md:w-96 lg:w-[28rem]',
}

const paneScrollClasses: Record<SplitPaneScroll, string> = {
  internal: 'mc-scroll-region flex-1',
  managed: 'min-h-0 flex-1 overflow-hidden',
}

/**
 * A responsive master/detail contract for inbox/chat and comparable flows.
 *
 * Both pane wrappers and both children are always rendered. On mobile the
 * inactive pane is hidden with CSS, preserving component identity and local
 * state when `mobilePane` changes. Tablet and desktop always show both panes.
 */
export default function SplitPanePage({
  ariaLabel,
  primaryLabel,
  secondaryLabel,
  primary,
  secondary,
  mobilePane = 'primary',
  primaryWidth = 'standard',
  primaryScroll = 'internal',
  secondaryScroll = 'managed',
}: SplitPanePageProps) {
  const primaryVisibility =
    mobilePane === 'primary' ? 'flex' : 'hidden md:flex'
  const secondaryVisibility =
    mobilePane === 'secondary' ? 'flex' : 'hidden md:flex'

  return (
    <section
      aria-label={ariaLabel}
      className="px-safe flex h-[calc(100dvh-var(--mc-header-height)-var(--mc-safe-top)-var(--mc-bottom-nav-height)-var(--mc-safe-bottom))] min-h-0 min-w-0 overflow-hidden bg-(--bg-primary) md:h-[calc(100dvh-var(--mc-header-height)-var(--mc-safe-top))]"
    >
      <aside
        aria-label={primaryLabel}
        className={`${primaryVisibility} min-h-0 min-w-0 w-full shrink-0 flex-col border-(--border-subtle) bg-(--bg-surface) md:border-r ${primaryWidthClasses[primaryWidth]}`}
      >
        <div className={paneScrollClasses[primaryScroll]}>{primary}</div>
      </aside>

      <section
        aria-label={secondaryLabel}
        className={`${secondaryVisibility} min-h-0 min-w-0 flex-1 flex-col bg-(--bg-primary)`}
      >
        <div className={paneScrollClasses[secondaryScroll]}>{secondary}</div>
      </section>
    </section>
  )
}
