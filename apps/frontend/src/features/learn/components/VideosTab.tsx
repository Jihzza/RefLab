import { useTranslation } from 'react-i18next'

/**
 * VideosTab - Placeholder for Videos feature
 *
 * Will display educational videos for referee training
 */
export default function VideosTab() {
  const { t } = useTranslation()

  return (
    <div className="p-6">
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">{t('Videos')}</h2>
        <p className="mt-2 text-gray-500">{t('Training videos coming soon.')}</p>
      </div>
    </div>
  )
}
