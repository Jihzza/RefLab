import { ArrowLeft, LayoutDashboard, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, ProgressBar, Surface } from '@/components/ui'
import type { TestAttempt } from '../types'
import { LearningSectionHeading, MatchAccent } from './LearningUI'

interface TestResultsProps {
  attempt: TestAttempt
  testTitle: string
}

export default function TestResults({ attempt, testTitle }: TestResultsProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scorePercent = attempt.score_percent ?? 0
  const scoreCorrect = attempt.score_correct ?? 0
  const scoreTotal = attempt.score_total ?? 0
  const tone = scorePercent >= 80 ? 'success' : scorePercent >= 60 ? 'warning' : 'danger'
  const scoreColor = tone === 'success'
    ? 'text-(--mc-color-success)'
    : tone === 'warning'
      ? 'text-(--mc-color-warning)'
      : 'text-(--mc-color-danger)'
  const scoreMessage = scorePercent >= 80
    ? t('Excellent work!')
    : scorePercent >= 60
      ? t('Good effort!')
      : t('Keep practicing!')

  return (
    <section className="min-h-full bg-(--mc-color-canvas) pb-24 pt-4 md:pt-6" aria-label={t('Test Completed')}>
      <div className="mc-page mc-page--narrow space-y-5 md:space-y-6">
        <LearningSectionHeading
          eyebrow={t('Test Completed')}
          title={testTitle}
          description={scoreMessage}
        />

        <Surface className="relative overflow-hidden border-(--mc-color-accent)/35" padding="lg" variant="raised">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-36 opacity-15" aria-hidden="true">
            <span className="absolute right-0 top-0 h-full w-16 -skew-x-[18deg] bg-(--mc-color-accent)" />
            <span className="absolute right-20 top-0 h-full w-7 -skew-x-[18deg] bg-(--mc-color-danger)" />
          </div>
          <div className="relative">
            <div className="mb-5 flex items-center gap-3">
              <MatchAccent />
              <Badge variant={tone}>{scoreMessage}</Badge>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className={`mc-tabular text-6xl font-extrabold tracking-[-0.06em] ${scoreColor}`}>{scorePercent}%</p>
                <p className="mt-2 text-sm text-(--mc-color-text-secondary)">
                  {t('{{correct}} out of {{total}} correct', { correct: scoreCorrect, total: scoreTotal })}
                </p>
              </div>
              <span className={`hidden size-14 items-center justify-center rounded-xl border bg-(--mc-color-canvas)/75 sm:flex ${scoreColor}`}>
                <Trophy size={27} aria-hidden="true" />
              </span>
            </div>
            <ProgressBar className="mt-6" value={scorePercent} tone={tone} size="sm" />
          </div>
        </Surface>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button fullWidth leadingIcon={<LayoutDashboard size={17} />} onClick={() => navigate('/app/dashboard')}>
            {t('View Dashboard')}
          </Button>
          <Button variant="secondary" fullWidth leadingIcon={<ArrowLeft size={17} />} onClick={() => navigate('/app/learn')}>
            {t('Back to Learn')}
          </Button>
        </div>
      </div>
    </section>
  )
}
