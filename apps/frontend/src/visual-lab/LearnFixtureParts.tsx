import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export type LearnFixtureTab = 'test' | 'questions' | 'videos' | 'courses' | 'resources'

const tabs: ReadonlyArray<{ key: LearnFixtureTab; label: string }> = [
  { key: 'test', label: 'Test' },
  { key: 'questions', label: 'Questions' },
  { key: 'videos', label: 'Videos' },
  { key: 'courses', label: 'Courses' },
  { key: 'resources', label: 'Resources' },
]

export function LearnFixtureNav({ activeTab }: { activeTab: LearnFixtureTab }) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('Learn navigation')}
      className="-mx-4 border-b border-(--mc-color-border) px-4 sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8"
    >
      <div role="tablist" className="no-scrollbar flex min-w-0 gap-5 overflow-x-auto sm:gap-7">
        {tabs.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              id={`fixture-learn-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="fixture-learn-panel"
              tabIndex={active ? 0 : -1}
              className={`relative min-h-12 shrink-0 whitespace-nowrap px-1 py-3 text-sm font-semibold sm:text-base ${
                active
                  ? 'text-(--mc-color-text) after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-(--mc-color-accent)'
                  : 'text-(--mc-color-text-muted)'
              }`}
            >
              {t(tab.label)}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function PrimaryActionFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-(--mc-radius-button)">
      {children}
      <span
        className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-9 -skew-x-[24deg] bg-(--mc-color-danger)"
        aria-hidden="true"
      />
    </div>
  )
}

export function PitchDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 170"
      className={`pointer-events-none absolute text-(--mc-color-border-strong) ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M49 8 229 24 209 158 13 126Z" />
      <path d="m128 15-9 127" />
      <ellipse cx="122" cy="78" rx="25" ry="19" transform="rotate(-5 122 78)" />
      <path d="M42 55 17 52M39 87 14 82M201 60l24 3M196 105l23 5" />
      <path d="m46 43-26-3-5 51 25 6M204 47l23 3-8 72-25-6" />
    </svg>
  )
}
