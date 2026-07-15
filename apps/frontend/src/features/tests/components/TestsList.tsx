import { useEffect, useState } from 'react'
import { ClipboardList, Play, RefreshCw, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Skeleton, Surface } from '@/components/ui'
import { getTests } from '@/features/learn/api/testsApi'
import type { Test } from '@/features/learn/types'

export default function TestsList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    void getTests()
      .then(({ data, error: loadError }) => {
        if (cancelled) return

        if (loadError) {
          setTests([])
          setError(loadError.message)
        } else {
          setTests(data ?? [])
          setError(null)
        }
        setLoading(false)
      })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setTests([])
        setError(loadError instanceof Error ? loadError.message : t('Could not load tests'))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey, t])

  const retry = () => {
    setLoading(true)
    setError(null)
    setReloadKey((current) => current + 1)
  }

  return (
    <section
      className="mx-auto w-full max-w-(--mc-content-standard) space-y-5 px-4 py-5 pb-24 sm:px-6 sm:py-7 lg:space-y-6"
      aria-labelledby="tests-list-title"
      aria-busy={loading}
    >
      <div>
        <p className="mc-eyebrow mb-1">{t('Test')}</p>
        <h2
          id="tests-list-title"
          className="text-[28px] font-extrabold leading-tight tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl"
        >
          {t('Tests Disponibles')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-(--mc-color-text-secondary) sm:text-base">
          {t('Choose a test from the active RefLab catalogue.')}
        </p>
      </div>

      {loading ? <TestsListSkeleton /> : null}

      {!loading && error ? (
        <Surface role="alert" padding="none" className="overflow-hidden">
          <EmptyState
            title={t('Could not load tests')}
            description={t('Check your connection and try again.')}
            icon={<TriangleAlert className="size-6" />}
            action={(
              <Button
                type="button"
                variant="secondary"
                onClick={retry}
                leadingIcon={<RefreshCw className="size-4" />}
              >
                {t('Try again')}
              </Button>
            )}
          />
        </Surface>
      ) : null}

      {!loading && !error && tests.length === 0 ? (
        <Surface padding="none">
          <EmptyState
            title={t('No tests available')}
            description={t('There are no active tests at the moment.')}
            icon={<ClipboardList className="size-6" />}
          />
        </Surface>
      ) : null}

      {!loading && !error && tests.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tests.map((test) => (
            <li key={test.id} className="min-w-0">
              <Surface
                padding="none"
                className="group flex h-full min-h-[300px] flex-col overflow-hidden border-(--mc-color-border-strong) shadow-none transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-(--mc-color-accent)/55 hover:shadow-(--mc-shadow-soft) motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="relative flex min-h-[210px] flex-1 flex-col overflow-hidden px-5 py-6 sm:px-6">
                  <PitchDiagram />
                  <span
                    className="relative z-10 flex size-12 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-accent)/45 bg-(--mc-color-accent)/10 text-(--mc-color-accent)"
                    aria-hidden="true"
                  >
                    <ClipboardList className="size-7" />
                  </span>

                  <div className="relative z-10 mt-auto pt-8">
                    <p className="mc-eyebrow mb-2">{test.topic || t('General refereeing')}</p>
                    <h3 className="text-xl font-extrabold leading-tight tracking-[-0.025em] text-(--mc-color-text) sm:text-2xl">
                      {test.title}
                    </h3>
                    <p className="mt-3 text-sm text-(--mc-color-text-secondary)">
                      {t('Knowledge test')}
                    </p>
                  </div>
                </div>

                <div className="border-t border-(--mc-color-border) p-4">
                  <div className="relative overflow-hidden rounded-(--mc-radius-button)">
                    <Button
                      fullWidth
                      size="lg"
                      onClick={() => navigate(`/app/learn/test/${encodeURIComponent(test.slug)}`)}
                      leadingIcon={<Play className="size-4 fill-current" />}
                      className="rounded-none pr-12"
                      aria-label={`${t('Comenzar Test')}: ${test.title}`}
                    >
                      {t('Comenzar Test')}
                    </Button>
                    <span
                      className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-8 -skew-x-[24deg] bg-(--mc-color-danger)"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function TestsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="A carregar testes">
      {Array.from({ length: 3 }, (_, index) => (
        <Surface key={index} padding="lg" className="min-h-[300px] space-y-5">
          <Skeleton variant="circular" width="3rem" />
          <div className="space-y-3 pt-16">
            <Skeleton variant="text" width="45%" />
            <Skeleton variant="text" width="82%" height="1.75rem" />
            <Skeleton variant="text" width="35%" />
          </div>
          <Skeleton height="3rem" />
        </Surface>
      ))}
    </div>
  )
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 240 150"
      className="pointer-events-none absolute -right-12 -top-6 h-44 w-64 rotate-12 text-(--mc-color-border-strong) opacity-40 transition-opacity group-hover:opacity-60 motion-reduce:transition-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="224" height="134" />
      <path d="M120 8v134" />
      <circle cx="120" cy="75" r="24" />
      <path d="M8 48h40v54H8M232 48h-40v54h40" />
      <path d="M8 62h17v26H8M232 62h-17v26h17" />
    </svg>
  )
}
