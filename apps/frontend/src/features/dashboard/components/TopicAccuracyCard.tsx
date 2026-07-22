import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, BookOpen, Flag, Hand, MonitorCheck, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Surface from '@/components/ui/Surface'
import type { TopicAccuracy } from '../types'
import { getTranslatedTopic } from './topicLabels'

interface TopicAccuracyCardProps {
  topics: TopicAccuracy[]
}

const toneClasses = {
  success: 'text-(--mc-color-success)',
  accent: 'text-(--mc-color-accent)',
  warning: 'text-(--mc-color-warning)',
  danger: 'text-(--mc-color-danger)',
}

export default function TopicAccuracyCard({ topics }: TopicAccuracyCardProps) {
  const { t, i18n } = useTranslation()

  return (
    <Surface
      padding="none"
      className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
      role="region"
      aria-label={t('Accuracy by Topic')}
    >
      <div className="border-b border-(--mc-color-border) px-4 py-3.5">
        <h2 className="text-sm font-semibold text-(--mc-color-text)">{t('Accuracy by Topic')}</h2>
      </div>

      {topics.length > 0 ? (
        <ul className="divide-y divide-(--mc-color-border)">
          {topics.map((topic) => {
            const topicLabel = getTranslatedTopic(topic.topic, t)
            const tier = getAccuracyTier(topic.accuracy)
            const TopicIcon = getTopicIcon(topic.topic)

            return (
              <li key={topic.topic} className="relative flex min-h-[58px] items-center gap-3 overflow-hidden px-4 py-2.5">
                <div
                  className="pointer-events-none absolute inset-y-0 right-12 w-28 opacity-[0.07]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(112deg, transparent 0 8px, var(--mc-color-text-muted) 8px 13px)',
                  }}
                  aria-hidden="true"
                />

                <TopicIcon className="relative z-10 size-5 shrink-0 text-(--mc-color-accent)" aria-hidden="true" />
                <div className="relative z-10 min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-(--mc-color-text)">{topicLabel}</p>
                  <p className="mt-0.5 text-[10px] text-(--mc-color-text-muted)">
                    {topic.total_questions} {topic.total_questions === 1 ? t('question') : t('questions')}
                  </p>
                </div>
                <span className={`relative z-10 w-12 shrink-0 text-right text-sm font-bold tabular-nums ${toneClasses[tier]}`}>
                  {formatNumber(topic.accuracy, i18n.resolvedLanguage)}%
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
          <BookOpen className="size-5 text-(--mc-color-accent)" aria-hidden="true" />
          <p className="mt-2 text-xs text-(--mc-color-text-muted)">
            {t('Complete tests to see topic breakdown')}
          </p>
        </div>
      )}
    </Surface>
  )
}

function getTopicIcon(topic: string): LucideIcon {
  const normalized = topic.trim().toLowerCase()
  if (normalized.includes('offside')) return Flag
  if (normalized.includes('foul') || normalized.includes('free kick')) return AlertTriangle
  if (normalized.includes('var') || normalized.includes('video')) return MonitorCheck
  if (normalized.includes('handball')) return Hand
  if (normalized.includes('card') || normalized.includes('discipline')) return ShieldAlert
  return BookOpen
}

function getAccuracyTier(accuracy: number): keyof typeof toneClasses {
  if (accuracy >= 85) return 'success'
  if (accuracy >= 75) return 'accent'
  if (accuracy >= 60) return 'warning'
  return 'danger'
}

function formatNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale ?? 'pt-PT', { maximumFractionDigits: 1 }).format(value)
}
