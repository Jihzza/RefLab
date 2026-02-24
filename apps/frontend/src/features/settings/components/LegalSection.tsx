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
    <SettingsSection title={t('Legal')} icon={<Scale className="w-4.5 h-4.5" />}>
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.label}
          to={link.to}
          className="flex items-center justify-between px-4 py-3 hover:bg-(--bg-hover) transition-colors"
        >
          <span className="text-sm text-(--text-primary)">{t(link.label)}</span>
          <ChevronRight className="w-4 h-4 text-(--text-muted)" />
        </Link>
      ))}
    </SettingsSection>
  )
}
