import { Scale, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import SettingsSection from './SettingsSection'
import { useTranslation } from 'react-i18next'

const LEGAL_LINKS = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Cookies Policy', to: '/cookies' },
]

export default function LegalSection() {
  const { t } = useTranslation()

  return (
    <SettingsSection
      title={t('Legal')}
      description={`${t('Privacy Policy')} · ${t('Terms of Service')} · ${t('Cookies Policy')}`}
      icon={<Scale className="size-7" />}
      grouped
    >
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.label}
          to={link.to}
          className="group flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none sm:px-5"
        >
          <span className="text-sm font-medium text-(--mc-color-text)">{t(link.label)}</span>
          <ChevronRight
            className="size-5 text-(--mc-color-text-muted) transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      ))}
    </SettingsSection>
  )
}
