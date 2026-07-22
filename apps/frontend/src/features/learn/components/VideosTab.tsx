import { useTranslation } from 'react-i18next'
import { Video } from 'lucide-react'
import { LearningMessage } from './LearningUI'

/**
 * VideosTab - Placeholder for Videos feature
 *
 * Will display educational videos for referee training
 */
export default function VideosTab() {
  const { t } = useTranslation()

  return (
    <LearningMessage
      icon={<Video size={22} />}
      title={t('Videos')}
      description={t('Training videos coming soon.')}
    />
  )
}
