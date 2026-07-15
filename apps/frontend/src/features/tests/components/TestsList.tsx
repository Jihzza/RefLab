import { ClipboardList, Clock3, ListChecks, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Surface } from '@/components/ui'

const tests = [
  { id: 'react-basics', title: 'React Basics', questions: 10, time: '15m' },
  { id: 'js-advanced', title: 'JavaScript Advanced', questions: 20, time: '30m' },
  { id: 'css-flexbox', title: 'CSS Flexbox', questions: 15, time: '20m' },
]

export default function TestsList() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section
      className="mx-auto w-full max-w-(--mc-content-standard) space-y-5 px-4 py-5 pb-24 sm:px-6 sm:py-7 lg:space-y-6"
      aria-labelledby="tests-list-title"
    >
      <div>
        <p className="mc-eyebrow mb-1">{t('Test')}</p>
        <h2
          id="tests-list-title"
          className="text-[28px] font-extrabold leading-tight tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl"
        >
          {t('Tests Disponibles')}
        </h2>
      </div>

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
                  <h3 className="text-xl font-extrabold leading-tight tracking-[-0.025em] text-(--mc-color-text) sm:text-2xl">
                    {test.title}
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-(--mc-color-text-secondary)">
                    <span className="flex items-center gap-1.5">
                      <ListChecks className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
                      {test.questions} {t('preguntas')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
                      {test.time}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-(--mc-color-border) p-4">
                <div className="relative overflow-hidden rounded-(--mc-radius-button)">
                  <Button
                    fullWidth
                    size="lg"
                    onClick={() => navigate(`/app/learn/test/${test.id}`)}
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
    </section>
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
