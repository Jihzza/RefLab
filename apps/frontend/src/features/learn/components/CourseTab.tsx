import { useTranslation } from 'react-i18next'
import { GraduationCap } from 'lucide-react'
import { LearningMessage } from './LearningUI'

/**
 * CourseTab - Placeholder for Course feature
 *
 * Will display structured learning courses
 */
export default function CourseTab() {
  const { t } = useTranslation()

  return (
    <LearningMessage
      icon={<GraduationCap size={22} />}
      title={t('Course')}
      description={t('Structured courses coming soon.')}
    />
  )
}
