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
    <SettingsSection title={t('Legal')} icon={<Scale className="size-5" />}>
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.label}
          to={link.to}
          className="group flex min-h-12 items-center justify-between px-4 py-3 transition-colors hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus) sm:px-5"
        >
          <span className="text-sm font-medium text-(--mc-color-text)">{t(link.label)}</span>
          <ChevronRight className="size-4 text-(--mc-color-text-muted) transition-transform group-hover:translate-x-0.5 group-hover:text-(--mc-color-accent)" aria-hidden="true" />
        </Link>
      ))}
    </SettingsSection>
  )
}
