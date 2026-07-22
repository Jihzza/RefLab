import type { LearnTab } from '../types'
import { useTranslation } from 'react-i18next'

interface LearnTabsProps {
  activeTab: LearnTab
  onTabChange: (tab: LearnTab) => void
}

// Tab configuration - easy to add/remove tabs
const tabs: { id: LearnTab; label: string }[] = [
  { id: 'tests', label: 'Tests' },
  { id: 'questions', label: 'Questions' },
  { id: 'videos', label: 'Videos' },
  { id: 'course', label: 'Course' },
  { id: 'resources', label: 'Resources' },
]

/**
 * LearnTabs - Top navigation bar for the Learn page
 *
 * Displays 5 tabs: Tests, Questions, Videos, Course, Resources
 * Active tab is highlighted with a bottom border
 */
export default function LearnTabs({ activeTab, onTabChange }: LearnTabsProps) {
  const { t } = useTranslation()

  return (
    <div className="no-scrollbar overflow-x-auto rounded-xl border border-(--mc-color-border) bg-(--mc-color-surface) p-1 shadow-(--mc-shadow-soft)">
      <nav className="flex min-w-max gap-1 sm:min-w-0" aria-label={t('Learn navigation')}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`mc-focus-ring mc-interactive min-h-11 shrink-0 rounded-lg px-4 py-2 text-xs font-bold sm:flex-1
                ${
                  isActive
                    ? 'bg-(--mc-color-accent) text-(--mc-color-canvas)'
                    : 'text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {t(tab.label)}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
