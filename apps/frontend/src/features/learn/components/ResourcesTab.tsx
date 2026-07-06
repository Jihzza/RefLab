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
        <h2 className="text-xl font-semibold text-(--text-primary)">{t('Resources')}</h2>
        <p className="mt-2 text-(--text-muted)">{t('Study resources coming soon.')}</p>
      </div>
    </div>
  )
}
