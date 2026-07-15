import { LoaderCircle, LockKeyhole } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Surface } from '@/components/ui'
import type { OptionLetter, TestQuestion } from '../types'

interface QuestionCardProps {
  question: TestQuestion
  questionNumber: number
  totalQuestions: number
  selectedOption: OptionLetter | null
  onSelectOption: (option: OptionLetter) => void
  isLocked?: boolean // When answer is already submitted
  isSaving?: boolean
  disabled?: boolean
}

/**
 * QuestionCard - Displays a single question with 4 options
 *
 * Shows question text and clickable option buttons.
 * Selected option is highlighted with the Match Control accent.
 */
export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  onSelectOption,
  isLocked = false,
  isSaving = false,
  disabled = false,
}: QuestionCardProps) {
  const { t } = useTranslation()
  const options: { letter: OptionLetter; text: string }[] = [
    { letter: 'A', text: question.option_a },
    { letter: 'B', text: question.option_b },
    { letter: 'C', text: question.option_c },
    { letter: 'D', text: question.option_d },
  ]
  const questionContext = getQuestionContext(question, t)
  const questionLabel = t('Question {{current}} of {{total}}', {
    current: questionNumber,
    total: totalQuestions,
  })
  const interactionDisabled = isLocked || isSaving || disabled

  return (
    <section className="space-y-4" aria-labelledby="active-test-question">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {questionContext && (
          <div className="min-w-0 flex-1 rounded-(--mc-radius-compact) border border-(--mc-color-border-strong) bg-(--mc-color-surface) px-4 py-3 text-xs font-bold tracking-[0.06em] text-(--mc-color-text-secondary) uppercase sm:text-sm">
            {questionContext}
          </div>
        )}
        <span className="shrink-0 text-sm font-medium tabular-nums text-(--mc-color-text-secondary)">
          {questionLabel}
        </span>
      </div>

      <Surface
        padding="none"
        className="relative overflow-hidden border-(--mc-color-border-strong) shadow-none"
      >
        <PitchDiagram />
        <div className="relative z-10 px-5 py-6 sm:px-7 sm:py-8">
          <h3
            id="active-test-question"
            className="max-w-2xl text-[22px] font-bold leading-[1.35] tracking-[-0.025em] text-(--mc-color-text) sm:text-3xl"
          >
            {question.question_text}
          </h3>
        </div>
      </Surface>

      <fieldset>
        <legend className="mc-visually-hidden">{question.question_text}</legend>
        <div className="space-y-3">
          {options.map((option) => {
            const isSelected = selectedOption === option.letter

            return (
              <button
                key={option.letter}
                type="button"
                onClick={() => {
                  if (!interactionDisabled) onSelectOption(option.letter)
                }}
                disabled={interactionDisabled}
                aria-pressed={isSelected}
                aria-busy={isSaving && isSelected ? true : undefined}
                className={`mc-interactive mc-focus-ring group flex min-h-[72px] w-full items-center gap-4 rounded-(--mc-radius-button) border px-3.5 py-3 text-left sm:px-4 ${
                  isSelected
                    ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/10 text-(--mc-color-text) shadow-[inset_0_0_0_1px_var(--mc-color-accent)]'
                    : 'border-(--mc-color-border-strong) bg-(--mc-color-surface) text-(--mc-color-text) hover:border-(--mc-color-accent)/55 hover:bg-(--mc-color-surface-hover)'
                } ${interactionDisabled && !isSelected ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-compact) border text-lg font-bold ${
                    isSelected
                      ? 'border-(--mc-color-accent) text-(--mc-color-accent)'
                      : 'border-(--mc-color-border-strong) text-(--mc-color-text)'
                  }`}
                  aria-hidden="true"
                >
                  {option.letter}
                </span>
                <span className="min-w-0 text-sm font-medium leading-6 sm:text-base">
                  {option.text}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {isSaving && (
        <div
          className="flex items-center gap-3 rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface) px-4 py-3.5 text-(--mc-color-text-secondary)"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle className="size-5 shrink-0 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
          <p className="text-xs leading-5 sm:text-sm">{t('Saving...')}</p>
        </div>
      )}

      {isLocked && (
        <div
          className="flex items-start gap-3 rounded-(--mc-radius-button) border border-(--mc-color-border) bg-(--mc-color-surface) px-4 py-3.5 text-(--mc-color-text-secondary)"
          role="status"
        >
          <LockKeyhole className="mt-0.5 size-5 shrink-0 text-(--mc-color-text-muted)" aria-hidden="true" />
          <p className="text-xs leading-5 sm:text-sm">
            {t('Answer locked. Use navigation buttons to continue.')}
          </p>
        </div>
      )}
    </section>
  )
}

function getQuestionContext(
  question: TestQuestion,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (question.law !== null) {
    const translated = t('Law {{law}} — {{name}}', {
      law: question.law,
      name: question.topic ? t(question.topic) : '',
    })
    return question.topic ? translated : translated.replace(/\s*[—-]\s*$/, '')
  }
  return question.topic ? t(question.topic) : null
}

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 240 170"
      className="pointer-events-none absolute -right-10 top-0 h-full w-[55%] text-(--mc-color-border-strong) opacity-65"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M49 8 229 24 209 158 13 126Z" />
      <path d="m128 15-9 127" />
      <ellipse cx="122" cy="78" rx="25" ry="19" transform="rotate(-5 122 78)" />
      <path d="m46 43-26-3-5 51 25 6M204 47l23 3-8 72-25-6" />
    </svg>
  )
}
