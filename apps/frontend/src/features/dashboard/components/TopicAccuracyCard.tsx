import { BookOpen } from 'lucide-react'
import type { TopicAccuracy } from '../types'
import { accuracyColor } from './accuracyColor'
import { useTranslation } from 'react-i18next'

interface TopicAccuracyCardProps {
  topics: TopicAccuracy[]
}

/**
 * TopicAccuracyCard — Strengths & weaknesses breakdown per topic as compact
 * referee-semantic bars with percentage values.
 */
export default function TopicAccuracyCard({ topics }: TopicAccuracyCardProps) {
  const { t } = useTranslation()
  const hasTopics = topics.length > 0

  return (
    <div
      className="card-console p-4 sm:p-5"
      role="region"
      aria-label={t('Accuracy by Topic')}
    >
      <h3 className="eyebrow mb-3.5">{t('Accuracy by Topic')}</h3>

      {hasTopics ? (
        <div className="space-y-3.5">
          {topics.map((topic) => {
            const topicLabel = getTranslatedTopic(topic.topic, t)
            const color = accuracyColor(topic.accuracy)

            return (
              <div key={topic.topic}>
                {/* Topic name + percentage */}
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-medium text-(--text-primary) truncate mr-3">
                    {topicLabel}
                  </span>
                  <span
                    className="numeral text-sm font-bold shrink-0"
                    style={{ color }}
                  >
                    {topic.accuracy}%
                  </span>
                </div>

                {/* Full-width bar */}
                <div
                  className="w-full bg-(--bg-surface-2) h-2 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={topic.accuracy}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${topicLabel}: ${topic.accuracy}%`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(topic.accuracy, 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <BookOpen size={20} className="text-(--text-faint) mb-2" aria-hidden="true" />
          <p className="text-xs text-(--text-muted)">
            {t('Complete tests to see topic breakdown')}
          </p>
        </div>
      )}
    </div>
  )
}

function getTranslatedTopic(topic: string, t: (key: string) => string): string {
  const normalized = topic.trim().toLowerCase()
  const topicAliases: Record<string, string> = {
    offside: 'Offside',
    fouls: 'Fouls',
    'fouls & misconduct': 'Fouls & Misconduct',
    handball: 'Handball',
    penalties: 'Penalties',
    advantage: 'Advantage',
    cards: 'Cards',
    'cards & discipline': 'Cards & Discipline',
    substitutions: 'Substitutions',
    var: 'VAR',
    'free kicks': 'Free Kicks',
    'throw-ins': 'Throw-Ins',
    'goal kicks': 'Goal Kicks',
    'corner kicks': 'Corner Kicks',
    general: 'General',
    'general laws of the game': 'General Laws of the Game',
    uncategorized: 'Uncategorized',
  }

  return t(topicAliases[normalized] ?? topic)
}
