import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Surface } from '@/components/ui'
import type { OptionLetter, TestQuestion } from '../types'
import { LearningChoice } from './LearningUI'

interface QuestionCardProps {
  question: TestQuestion
  questionNumber: number
  totalQuestions: number
  selectedOption: OptionLetter | null
  onSelectOption: (option: OptionLetter) => void
  isLocked?: boolean
}

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
    <Surface padding="none" variant="raised">
      <div className="border-b border-(--mc-color-border) px-4 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            {t('Question {{current}} of {{total}}', { current: questionNumber, total: totalQuestions })}
          </Badge>
          {question.law !== null && <Badge>L{question.law}</Badge>}
          {question.topic && <Badge>{question.topic}</Badge>}
        </div>
        <h2 className="text-base font-semibold leading-7 text-(--mc-color-text) sm:text-lg">
          {question.question_text}
        </h2>
      </div>

      <div className="space-y-2.5 p-4 sm:p-6">
        {options.map((option) => {
          const isSelected = selectedOption === option.letter
          return (
            <LearningChoice
              key={option.letter}
              marker={isSelected ? <Check size={15} /> : option.letter}
              state={isSelected ? 'selected' : 'default'}
              onClick={() => onSelectOption(option.letter)}
              disabled={isLocked}
              aria-pressed={isSelected}
            >
              {option.text}
            </LearningChoice>
          )
        })}
      </div>
    </Surface>
  )
}
