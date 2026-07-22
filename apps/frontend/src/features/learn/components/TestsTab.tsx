import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, BookOpen, ClipboardCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Skeleton, Surface } from '@/components/ui'
import { getTests } from '../api/testsApi'
import type { Test } from '../types'
import { LearningError, LearningMessage, LearningSectionHeading } from './LearningUI'

export default function TestsTab() {
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
    <div className="space-y-5">
      <LearningSectionHeading eyebrow={t('Test')} title={t('Tests')} description={t('Click to start test')} />

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label={t('Loading...')}>
          {[1, 2, 3].map((item) => <Skeleton key={item} height="9rem" />)}
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
        <LearningMessage icon={<BookOpen size={22} />} title={t('No tests available yet.')} />
      )}

      {!loading && !error && tests.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {tests.map((test) => (
            <Surface key={test.id} className="flex min-h-40 flex-col" padding="md">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg border border-(--mc-color-accent)/30 bg-(--mc-color-accent)/10 text-(--mc-color-accent)">
                  <ClipboardCheck size={18} aria-hidden="true" />
                </span>
                {test.topic && <Badge variant="accent" size="sm">{test.topic}</Badge>}
              </div>
              <h3 className="font-bold leading-6 text-(--mc-color-text)">{test.title}</h3>
              <Button
                className="mt-auto pt-3"
                variant="ghost"
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
  )
}
