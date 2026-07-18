import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  ExternalLink,
  FileText,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, Surface } from '@/components/ui'
import LearnQuestionsView from './LearnQuestionsView'
import LearnTestView from './LearnTestView'
import VideoAnalysisView from './VideoAnalysisView'
import { getLearnRouteState } from './learnRouteState'

type TabKey = 'test' | 'questions' | 'videos' | 'courses' | 'resources'

const tabLabels: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'test', label: 'Test' },
  { key: 'questions', label: 'Questions' },
  { key: 'videos', label: 'Videos' },
  { key: 'courses', label: 'Courses' },
  { key: 'resources', label: 'Resources' },
]

const resources = [
  {
    id: 'laws-2026-27',
    title: 'Laws of the Game 2026/27 (PDF)',
    description: 'Official single-page edition from The IFAB.',
    href: 'https://downloads.theifab.com/downloads/laws-of-the-game-202627-single-pages?l=en',
  },
  {
    id: 'latest-law-changes',
    title: 'Latest law changes',
    description: 'Current changes and explanations from The IFAB.',
    href: 'https://www.theifab.com/law-changes/latest/',
  },
  {
    id: 'laws-online',
    title: 'Laws of the Game online',
    description: 'Browse the current Laws of the Game on The IFAB website.',
    href: 'https://www.theifab.com/laws/latest/about-the-laws/',
  },
  {
    id: 'laws-documents',
    title: 'Laws of the Game documents',
    description: 'Official Law documents and supporting material from The IFAB.',
    href: 'https://www.theifab.com/laws-of-the-game-documents/',
  },
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
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-(--mc-color-text-muted)">
                  {t(resource.description)}
                </p>
              </div>
              <a
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('Open official resource')}: ${t(resource.title)}`}
                className="mc-interactive mc-focus-ring inline-flex min-h-10 shrink-0 items-center gap-2 rounded-(--mc-radius-button) px-2 text-xs font-semibold text-(--mc-color-accent) hover:bg-(--mc-color-surface-hover)"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t('Open')}</span>
                <span className="sr-only sm:hidden">{t('Open official resource')}</span>
              </a>
            </Surface>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function LearnPage() {
  const { t } = useTranslation()
  const [, setSearchParams] = useSearchParams()
  const [routeState] = useState(getLearnRouteState)
  const [activeTab, setActiveTab] = useState<TabKey>('test')
  const [autoStartEnabled, setAutoStartEnabled] = useState(routeState.autoStartTest)
  const [immersiveMode, setImmersiveMode] = useState(routeState.autoStartTest)

  useEffect(() => {
    if (!routeState.autoStartTest) return

    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('action')
      return next
    }, { replace: true })
  }, [routeState, setSearchParams])

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
