import { ArrowLeft, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/components/useAuth'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const { authStatus } = useAuth()
  const destination = authStatus === 'authenticated' ? '/app/dashboard' : '/'

  return (
    <main className="min-h-[70vh] grid place-items-center px-5 py-16">
      <section className="mc-surface w-full max-w-lg p-8 text-center sm:p-12">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-(--border-strong) bg-(--surface-raised)">
          <SearchX className="size-8 text-(--brand-yellow)" aria-hidden="true" />
        </div>
        <p className="mc-kicker mb-3">404</p>
        <h1 className="mc-display text-3xl text-(--text-primary)">{t('Page not found')}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-(--text-secondary)">
          {t('The page you are looking for does not exist or has moved.')}
        </p>
        <Link
          to={destination}
          className="mc-button mc-button--primary mx-auto mt-8 inline-flex items-center gap-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('Back to RefLab')}
        </Link>
      </section>
    </main>
  )
}
