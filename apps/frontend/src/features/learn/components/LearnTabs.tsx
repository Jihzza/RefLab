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
    <div className="px-6 pt-2">
      <nav
        className="glass flex gap-1 overflow-x-auto no-scrollbar rounded-(--radius-pill) border border-(--border-subtle) p-1"
        aria-label={t('Learn navigation')}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                shrink-0 rounded-(--radius-pill) px-4 py-2 text-sm font-semibold whitespace-nowrap transition-[color,background-color,box-shadow] duration-(--dur-base)
                ${
                  isActive
                    ? 'text-(--bg-primary) shadow-[0_6px_18px_-8px_rgba(246,194,28,0.7)]'
                    : 'text-(--text-muted) hover:text-(--text-primary)'
                }
              `}
              style={isActive ? { backgroundImage: 'var(--grad-brand)' } : undefined}
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
