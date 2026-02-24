import { useTranslation } from 'react-i18next'

/**
 * QuestionsTab - Placeholder for Questions feature
 *
 * Will display individual practice questions outside of tests
 */
export default function QuestionsTab() {
  const { t } = useTranslation()

  return (
    <div className="p-6">
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">{t('Questions')}</h2>
        <p className="mt-2 text-gray-500">{t('Practice questions coming soon.')}</p>
      </div>
    </div>
  )
}
