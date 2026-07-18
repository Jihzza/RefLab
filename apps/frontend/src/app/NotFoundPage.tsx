import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface NotFoundPageProps {
  withinApp?: boolean
}

export default function NotFoundPage({ withinApp = false }: NotFoundPageProps) {
  const { t } = useTranslation()
  const destination = withinApp ? '/app' : '/'
  const label = withinApp ? t('Back to dashboard') : t('Back to Home')
  const DestinationIcon = withinApp ? LayoutDashboard : ArrowLeft
  const Root = withinApp ? 'div' : 'main'

  return (
    <Root className="flex min-h-[70vh] items-center justify-center bg-(--mc-color-canvas) px-4 py-12 sm:px-6">
      <section
        className="w-full max-w-xl rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) p-6 text-center shadow-(--mc-shadow-card) sm:p-10"
        aria-labelledby="not-found-title"
      >
        <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-(--mc-color-accent)">
          {t('Error 404')}
        </p>
        <h1
          id="not-found-title"
          className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl"
        >
          {t('Page not found')}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-(--mc-color-text-secondary) sm:text-base">
          {t('The address may be incorrect or the page may have moved. Use RefLab navigation to continue.')}
        </p>
        <Link
          to={destination}
          className="mc-interactive mc-focus-ring mx-auto mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-(--mc-radius-button) bg-(--mc-color-accent) px-5 py-2.5 text-sm font-extrabold text-(--mc-color-accent-contrast) hover:bg-(--mc-color-accent-strong)"
        >
          <DestinationIcon className="size-4" aria-hidden="true" />
          {label}
        </Link>
      </section>
    </Root>
  )
}
