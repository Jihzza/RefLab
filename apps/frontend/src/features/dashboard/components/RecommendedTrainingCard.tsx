import { BookOpenCheck, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Surface from '@/components/ui/Surface'
import type { TopicAccuracy } from '../types'
import { getTranslatedTopic } from './topicLabels'

interface RecommendedTrainingCardProps {
  topic: TopicAccuracy | null
  onStart: () => void
}

export default function RecommendedTrainingCard({
  topic,
  onStart,
}: RecommendedTrainingCardProps) {
  const { t, i18n } = useTranslation()
  const topicLabel = topic ? getTranslatedTopic(topic.topic, t) : null

  return (
    <Surface
      padding="none"
      className="relative flex min-h-[190px] flex-col overflow-hidden border-(--mc-color-border-strong) shadow-none"
      role="region"
      aria-label={t('Recommended training')}
    >
      <div
        className="pointer-events-none absolute -left-7 top-0 h-24 w-16 -skew-x-[24deg] bg-(--mc-color-accent)"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-3 -right-5 h-16 w-10 -skew-x-[24deg] bg-(--mc-color-danger)"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-1 items-center gap-3 px-5 pb-3 pt-5 sm:px-6">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-(--mc-color-accent)/70 bg-(--mc-color-canvas)/65 text-(--mc-color-accent)">
          {topic ? <Target className="size-5" aria-hidden="true" /> : <BookOpenCheck className="size-5" aria-hidden="true" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-(--mc-color-accent)">{t('Recommended training')}</p>
          <h2 className="mt-1 truncate text-lg font-semibold leading-tight text-(--mc-color-text) sm:text-xl">
            {topicLabel ?? t('Start New Test')}
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-(--mc-color-text-muted)">
            {topic
              ? `${topic.total_questions} ${topic.total_questions === 1 ? t('question') : t('questions')} · ${formatPercent(topic.accuracy, i18n.resolvedLanguage)} ${t('of accuracy')}`
              : t('Complete a test to receive a personalised recommendation.')}
          </p>
        </div>
      </div>

      <div className="relative z-10 px-4 pb-4 sm:px-5">
        <div className="relative overflow-hidden rounded-(--mc-radius-button)">
          <Button fullWidth size="lg" onClick={onStart} className="relative rounded-none pr-12">
            {t('Start New Test')}
          </Button>
          <span
            className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-8 -skew-x-[24deg] bg-(--mc-color-danger)"
            aria-hidden="true"
          />
        </div>
      </div>
    </Surface>
  )
}

function formatPercent(value: number, locale?: string): string {
  return `${new Intl.NumberFormat(locale ?? 'pt-PT', { maximumFractionDigits: 1 }).format(value)}%`
}
