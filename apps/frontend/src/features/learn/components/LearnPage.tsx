import { useRef, useState, type KeyboardEvent } from 'react'
import {
  Download,
  FileText,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Surface } from '@/components/ui'
import LearnQuestionsView from './LearnQuestionsView'
import LearnTestView from './LearnTestView'
import VideoAnalysisView from './VideoAnalysisView'
import { shouldAutoStartTest } from './learnRouteState'

type TabKey = 'test' | 'questions' | 'videos' | 'courses' | 'resources'

const tabLabels: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'test', label: 'Test' },
  { key: 'questions', label: 'Questions' },
  { key: 'videos', label: 'Videos' },
  { key: 'courses', label: 'Courses' },
  { key: 'resources', label: 'Resources' },
]

const resources = [
  { id: 1, title: 'Laws of the Game 2024/25', type: 'PDF', size: '2.4 MB' },
  { id: 2, title: 'Referee Positioning Guide', type: 'PDF', size: '1.1 MB' },
  { id: 3, title: 'Match Report Template', type: 'DOCX', size: '0.5 MB' },
  { id: 4, title: 'Fitness Test Standards', type: 'PDF', size: '0.8 MB' },
  { id: 5, title: 'VAR Protocol Handbook', type: 'PDF', size: '3.2 MB' },
] as const

interface LearnNavProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
}

function LearnNav({ activeTab, onTabChange }: LearnNavProps) {
  const { t } = useTranslation()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabLabels.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabLabels.length) % tabLabels.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabLabels.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const nextTab = tabLabels[nextIndex]
    if (!nextTab) return
    onTabChange(nextTab.key)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <nav
      aria-label={t('Learn navigation')}
      className="-mx-4 border-b border-(--mc-color-border) px-4 sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8"
    >
      <div role="tablist" className="no-scrollbar flex min-w-0 gap-5 overflow-x-auto sm:gap-7">
        {tabLabels.map((tab, index) => {
          const active = activeTab === tab.key

          return (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              id={`learn-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="learn-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(tab.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`relative min-h-12 shrink-0 whitespace-nowrap px-1 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-2 focus-visible:ring-offset-(--mc-color-canvas) motion-reduce:transition-none sm:text-base ${
                active
                  ? 'text-(--mc-color-text) after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-(--mc-color-accent)'
                  : 'text-(--mc-color-text-muted) hover:text-(--mc-color-text-secondary)'
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

function PlaceholderTab({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  const { t } = useTranslation()

  return (
    <Surface padding="none" className="overflow-hidden border-(--mc-color-border-strong) shadow-none">
      <EmptyState
        icon={<Icon className="size-5" />}
        title={t(title)}
        description={t('Coming soon.')}
      />
    </Surface>
  )
}

function ResourcesView() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="study-resources-title" className="space-y-4">
      <h2 id="study-resources-title" className="text-xl font-bold text-(--mc-color-text)">
        {t('Study Resources')}
      </h2>

      <ul className="grid gap-3 md:grid-cols-2">
        {resources.map((resource) => (
          <li key={resource.id} className="list-none">
            <Surface
              padding="md"
              className="flex min-h-[86px] items-center gap-3 border-(--mc-color-border-strong) shadow-none"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-accent)/35 bg-(--mc-color-accent)/10 text-(--mc-color-accent)">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-semibold text-(--mc-color-text)">
                  {t(resource.title)}
                </h3>
                <p className="mt-1 text-xs text-(--mc-color-text-muted)">
                  {resource.type} &middot; {resource.size}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<Download className="size-4" />}
                aria-label={`${t('Download')}: ${t(resource.title)}`}
                className="shrink-0 px-2 text-(--mc-color-accent)"
              >
                <span className="hidden sm:inline">{t('Download')}</span>
                <span className="sr-only sm:hidden">{t('Download')}</span>
              </Button>
            </Surface>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function LearnPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('test')
  const [autoStartEnabled, setAutoStartEnabled] = useState(shouldAutoStartTest)
  const [immersiveMode, setImmersiveMode] = useState(shouldAutoStartTest)

  const handleTabChange = (nextTab: TabKey) => {
    setActiveTab(nextTab)
    setImmersiveMode(false)
  }

  return (
    <div className="min-h-full bg-(--mc-color-canvas) pb-8 text-(--mc-color-text)">
      <div className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6 xl:px-8">
        {!immersiveMode && activeTab === 'test' && (
          <header className="pb-1 pt-5 sm:pt-7">
            <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-(--mc-color-text) sm:text-3xl">
              {t('Learn')}
            </h2>
          </header>
        )}

        {!immersiveMode && (
          <LearnNav activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        <div
          id="learn-panel"
          role={immersiveMode ? undefined : 'tabpanel'}
          aria-labelledby={immersiveMode ? undefined : `learn-tab-${activeTab}`}
          tabIndex={immersiveMode ? undefined : 0}
          className={`${immersiveMode ? 'py-4 sm:py-6' : 'pt-5 sm:pt-6'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)`}
        >
          {activeTab === 'test' && (
            <LearnTestView
              autoStart={autoStartEnabled}
              onAutoStartConsumed={() => setAutoStartEnabled(false)}
              onImmersiveChange={setImmersiveMode}
            />
          )}
          {activeTab === 'questions' && (
            <LearnQuestionsView onImmersiveChange={setImmersiveMode} />
          )}
          {activeTab === 'videos' && <VideoAnalysisView />}
          {activeTab === 'courses' && (
            <PlaceholderTab icon={GraduationCap} title="Courses" />
          )}
          {activeTab === 'resources' && <ResourcesView />}
        </div>
      </div>
    </div>
  )
}
