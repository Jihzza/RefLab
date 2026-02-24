import type { TestQuestion, OptionLetter } from '../types'
import { useTranslation } from 'react-i18next'

interface QuestionCardProps {
  question: TestQuestion
  questionNumber: number
  totalQuestions: number
  selectedOption: OptionLetter | null
  onSelectOption: (option: OptionLetter) => void
  isLocked?: boolean // When answer is already submitted
}

/**
 * QuestionCard - Displays a single question with 4 options
 *
 * Shows question text and clickable option buttons.
 * Selected option is highlighted in blue.
 */
export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  onSelectOption,
  isLocked = false,
}: QuestionCardProps) {
  const { t } = useTranslation()
  const options: { letter: OptionLetter; text: string }[] = [
    { letter: 'A', text: question.option_a },
    { letter: 'B', text: question.option_b },
    { letter: 'C', text: question.option_c },
    { letter: 'D', text: question.option_d },
  ]

  return (
    <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-6">
      {/* Question header */}
      <div className="mb-4">
        <span className="text-sm text-(--text-muted)">
          {t('Question {{current}} of {{total}}', { current: questionNumber, total: totalQuestions })}
        </span>
      </div>

      {/* Question text */}
      <h2 className="text-lg font-medium text-gray-900 mb-6">
        {question.question_text}
      </h2>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedOption === option.letter

          return (
            <button
              key={option.letter}
              onClick={() => !isLocked && onSelectOption(option.letter)}
              disabled={isLocked}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'border-(--info) bg-(--info)/10 text-(--text-primary)'
                  : 'border-(--border-subtle) hover:border-(--border-strong) hover:bg-(--bg-hover)'
                }
                ${isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
              `}
            >
              <span className="font-medium mr-3">{option.letter}.</span>
              {option.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
