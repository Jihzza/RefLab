import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import { LearningMessage } from './LearningUI'

/**
 * ResourcesTab - Placeholder for Resources feature
 *
 * Will display downloadable resources, rule books, etc.
 */
export default function ResourcesTab() {
  const { t } = useTranslation()

  return (
    <LearningMessage
      icon={<BookOpen size={22} />}
      title={t('Resources')}
      description={t('Study resources coming soon.')}
    />
  )
}
