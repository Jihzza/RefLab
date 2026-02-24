import { useTranslation } from 'react-i18next'

/**
 * ResourcesTab - Placeholder for Resources feature
 *
 * Will display downloadable resources, rule books, etc.
 */
export default function ResourcesTab() {
  const { t } = useTranslation()

  return (
    <div className="p-6">
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">{t('Resources')}</h2>
        <p className="mt-2 text-gray-500">{t('Study resources coming soon.')}</p>
      </div>
    </div>
  )
}
