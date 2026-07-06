import { GraduationCap } from 'lucide-react'
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
      <div className="card-console field-lines animate-fade-up flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-(--radius-card) border border-(--border-subtle) bg-(--bg-surface-2) shadow-[var(--shadow-soft)]">
          <GraduationCap className="h-6 w-6 text-(--brand-yellow)" aria-hidden="true" />
        </div>
        <p className="eyebrow mb-2">{t('On the training ground')}</p>
        <h2 className="text-xl font-bold text-(--text-primary) mb-1.5">{t('Course')}</h2>
        <p className="max-w-sm text-sm text-(--text-muted)">{t('Structured courses coming soon.')}</p>
      </div>
    </div>
  )
}
