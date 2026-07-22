import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, BookOpen, ClipboardCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Skeleton, Surface } from '@/components/ui'
import { getTests } from '@/features/learn/api/testsApi'
import {
  LearningError,
  LearningMessage,
  LearningSectionHeading,
  MatchAccent,
} from '@/features/learn/components/LearningUI'
import type { Test } from '@/features/learn/types'

export default function TestsList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTests = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await getTests()
    if (fetchError) {
      setTests([])
      setError(fetchError.message)
    } else {
      setTests(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void getTests().then(({ data, error: fetchError }) => {
      if (cancelled) return
      if (fetchError) {
        setTests([])
        setError(fetchError.message)
      } else {
        setTests(data ?? [])
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <section className="min-h-full bg-(--mc-color-canvas) pb-24 pt-4 md:pt-6" aria-label={t('Tests')}>
      <div className="mc-page mc-page--wide">
        <header className="mb-5 flex items-center gap-3 md:mb-6">
          <MatchAccent />
          <div>
            <p className="mc-eyebrow">RefLab</p>
            <h1 className="mc-page-title">{t('Tests')}</h1>
          </div>
        </header>

        <LearningSectionHeading
          eyebrow={t('Test')}
          title={t('Referee Knowledge Test')}
          description={t('Click to start test')}
        />

        <div className="mt-5 md:mt-6">
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('Loading...')} aria-busy="true">
              {[1, 2, 3].map((item) => <Skeleton key={item} height="10rem" />)}
            </div>
          )}

          {!loading && error && (
            <LearningError
              title={t('Failed to load test')}
              description={t('Error loading tests: {{error}}', { error })}
              retryLabel={t('Try Again')}
              onRetry={() => void loadTests()}
            />
          )}

          {!loading && !error && tests.length === 0 && (
            <LearningMessage
              icon={<BookOpen size={22} />}
              title={t('No tests available yet.')}
              description={t('Coming soon.')}
            />
          )}

          {!loading && !error && tests.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tests.map((test, index) => (
                <Surface
                  key={test.id}
                  className={`group flex min-h-44 flex-col overflow-hidden ${index === 0 ? 'border-(--mc-color-accent)/45' : ''}`}
                  padding="md"
                  variant={index === 0 ? 'raised' : 'default'}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl border border-(--mc-color-accent)/30 bg-(--mc-color-accent)/10 text-(--mc-color-accent)">
                      <ClipboardCheck size={20} aria-hidden="true" />
                    </span>
                    {test.topic && <Badge variant="accent" size="sm">{test.topic}</Badge>}
                  </div>
                  <h2 className="text-base font-bold leading-6 text-(--mc-color-text)">{test.title}</h2>
                  <Button
                    className="mt-auto pt-4"
                    variant={index === 0 ? 'primary' : 'ghost'}
                    fullWidth
                    trailingIcon={<ArrowRight size={16} />}
                    onClick={() => navigate(`/app/learn/test/${encodeURIComponent(test.slug)}`)}
                  >
                    {t('Click to start test')}
                  </Button>
                </Surface>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
