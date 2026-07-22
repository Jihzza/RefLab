import { useTranslation } from 'react-i18next'
import { CircleHelp } from 'lucide-react'
import { LearningMessage } from './LearningUI'

/**
 * QuestionsTab - Placeholder for Questions feature
 *
 * Will display individual practice questions outside of tests
 */
export default function QuestionsTab() {
  const { t } = useTranslation()

  return (
    <LearningMessage
      icon={<CircleHelp size={22} />}
      title={t('Questions')}
      description={t('Practice questions coming soon.')}
    />
  )
}
