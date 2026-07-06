import { useTranslation } from 'react-i18next'

/**
 * CourseTab - Placeholder for Course feature
 *
 * Will display structured learning courses
 */
export default function CourseTab() {
  const { t } = useTranslation()

  return (
    <div className="p-6">
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-(--text-primary)">{t('Course')}</h2>
        <p className="mt-2 text-(--text-muted)">{t('Structured courses coming soon.')}</p>
      </div>
    </div>
  )
}
