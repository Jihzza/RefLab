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
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8 px-6" aria-label={t('Learn navigation')}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                py-4 px-1 text-sm font-medium border-b-2 transition-colors
                ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
