import { useTranslation } from 'react-i18next'

interface GlobalErrorFallbackProps {
  onRetry: () => void
}

export default function GlobalErrorFallback({ onRetry }: GlobalErrorFallbackProps) {
  const { t } = useTranslation()

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-(--mc-color-canvas) px-4 py-10 text-(--mc-color-text) sm:px-6">
      <svg
        viewBox="0 0 360 240"
        className="pointer-events-none absolute -right-20 top-10 w-[30rem] text-(--mc-color-border-strong) opacity-35"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        aria-hidden="true"
      >
        <path d="M45 18 338 42 315 222 18 190Z" />
        <path d="m190 30-11 177" />
        <ellipse cx="184" cy="119" rx="39" ry="31" transform="rotate(-4 184 119)" />
        <path d="m43 74-32-3-7 70 33 7M305 81l34 4-9 91-34-6" />
      </svg>

      <section
        className="relative w-full max-w-xl overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface) p-6 shadow-(--mc-shadow-card) sm:p-9"
        aria-labelledby="global-error-title"
        role="alert"
      >
        <span
          className="pointer-events-none absolute -right-5 -top-8 h-28 w-12 -skew-x-[24deg] bg-(--mc-color-danger)"
          aria-hidden="true"
        />

        <div className="inline-flex items-center gap-2 text-lg font-extrabold" aria-label="RefLab">
          <span className="flex gap-0.5" aria-hidden="true">
            <span className="h-6 w-2 -skew-x-[24deg] bg-[#ffd000]" />
            <span className="h-6 w-2 -skew-x-[24deg] bg-[#ff8a00]" />
            <span className="h-6 w-2 -skew-x-[24deg] bg-[#ed1c24]" />
          </span>
          RefLab
        </div>

        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-(--mc-color-danger)">
          {t('Technical interruption')}
        </p>
        <h1
          id="global-error-title"
          className="mt-2 max-w-md text-3xl font-extrabold tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl"
        >
          {t('Something went wrong')}
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-(--mc-color-text-secondary) sm:text-base">
          {t('Try opening this screen again. If the problem continues, reload RefLab.')}
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRetry}
            className="mc-interactive mc-focus-ring inline-flex min-h-11 items-center justify-center rounded-(--mc-radius-button) bg-(--mc-color-accent) px-5 py-2.5 text-sm font-extrabold text-(--mc-color-accent-contrast) hover:bg-(--mc-color-accent-strong)"
          >
            {t('Reload RefLab')}
          </button>
        </div>

        <p className="mt-6 border-t border-(--mc-color-border) pt-5 text-sm text-(--mc-color-text-muted)">
          {t('Still having trouble?')}{' '}
          <a
            href="/support?topic=technical"
            className="mc-focus-ring rounded-sm font-semibold text-(--mc-color-info) underline underline-offset-2"
          >
            {t('Contact support')}
          </a>
        </p>
      </section>
    </main>
  )
}
