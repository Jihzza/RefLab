import { useCallback, useEffect, useState } from 'react'
import { BarChart3, BookOpen, ChevronRight, MapPin, Scale, Target, TrendingUp, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Surface } from '@/components/ui'
import { getQuestionSessionKPIs } from '../../api/testsApi'
import type { QuestionSessionKPIs } from '../../types'
import { LearningError, LearningMetric, LearningSectionHeading } from '../LearningUI'

interface QuestionsLandingProps {
  onStartQuick: () => void
  onStartByLaw: () => void
  onStartByArea: () => void
  creating?: boolean
}

export default function QuestionsLanding({
  onStartQuick,
  onStartByLaw,
  onStartByArea,
  creating = false,
}: QuestionsLandingProps) {
  const { t } = useTranslation()
  const [kpis, setKpis] = useState<QuestionSessionKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadKPIs = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const { data, error } = await getQuestionSessionKPIs()
    setKpis(data)
    setLoadError(Boolean(error))
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void getQuestionSessionKPIs().then(({ data, error }) => {
      if (cancelled) return
      setKpis(data)
      setLoadError(Boolean(error))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-5 md:space-y-6">
      <LearningSectionHeading
        eyebrow={t('Questions')}
        title={t('Practice Questions')}
        description={t('Answer at your own pace · No time limit')}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <ModeCard
          icon={<Zap size={22} />}
          title={t('Quick Questions')}
          description={t('Answer at your own pace · No time limit')}
          featured
          onClick={onStartQuick}
          loading={creating}
        />
        <ModeCard
          icon={<Scale size={22} />}
          title={t('By Law')}
          description={t('Choose one or more FIFA laws to practise. Questions from all selected laws will appear.')}
          onClick={onStartByLaw}
        />
        <ModeCard
          icon={<MapPin size={22} />}
          title={t('By Area')}
          description={t('Choose one or more areas to practise. Questions from all selected areas will appear.')}
          onClick={onStartByArea}
        />
      </div>

      {loadError ? (
        <LearningError
          title={t('Failed to load results')}
          description={t('Please try again')}
          retryLabel={t('Try Again')}
          onRetry={() => void loadKPIs()}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <LearningMetric
            icon={<BarChart3 size={17} />}
            label={t('Sessions This Week')}
            value={kpis?.sessionsThisWeek.toString() ?? '0'}
            loading={loading}
            emptyText={t('No sessions yet')}
          />
          <LearningMetric
            icon={<BookOpen size={17} />}
            label={t('Questions Answered')}
            value={kpis?.totalQuestionsAnswered.toString() ?? '0'}
            loading={loading}
            emptyText={t('No answers yet')}
          />
          <LearningMetric
            icon={<Target size={17} />}
            label={t('Overall Accuracy')}
            value={kpis?.overallAccuracy !== null && kpis?.overallAccuracy !== undefined ? `${kpis.overallAccuracy}%` : '—'}
            loading={loading}
            emptyText={t('Answer questions to see')}
          />
          <LearningMetric
            icon={<TrendingUp size={17} />}
            label={t('Avg Session Accuracy')}
            value={kpis?.avgSessionAccuracy !== null && kpis?.avgSessionAccuracy !== undefined ? `${kpis.avgSessionAccuracy}%` : '—'}
            loading={loading}
            emptyText={t('Complete a session')}
          />
        </div>
      )}
    </div>
  )
}

function ModeCard({
  icon,
  title,
  description,
  onClick,
  featured = false,
  loading = false,
}: {
  icon: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  onClick: () => void
  featured?: boolean
  loading?: boolean
}) {
  return (
    <Surface
      className={`group flex min-h-48 flex-col ${featured ? 'border-(--mc-color-accent)/55' : ''}`}
      padding="md"
      variant={featured ? 'raised' : 'default'}
    >
      <div className={`mb-4 flex size-10 items-center justify-center rounded-xl border ${
        featured
          ? 'border-(--mc-color-accent)/35 bg-(--mc-color-accent)/15 text-(--mc-color-accent)'
          : 'border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text-secondary)'
      }`}>
        {icon}
      </div>
      <h3 className="font-bold text-(--mc-color-text)">{title}</h3>
      <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-(--mc-color-text-muted)">{description}</p>
      <Button
        className="mt-auto pt-3"
        variant={featured ? 'primary' : 'ghost'}
        fullWidth
        trailingIcon={<ChevronRight size={16} />}
        onClick={onClick}
        loading={loading}
      >
        {title}
      </Button>
    </Surface>
  )
}
