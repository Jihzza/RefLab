import { Scale, ExternalLink } from 'lucide-react'
import SettingsSection from './SettingsSection'

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookies Policy', href: '/cookies' },
]

export default function LegalSection() {
  return (
    <SettingsSection title="Legal" icon={<Scale className="w-4.5 h-4.5" />}>
      {LEGAL_LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-3 hover:bg-(--bg-hover) transition-colors"
        >
          <span className="text-sm text-(--text-primary)">{link.label}</span>
          <ExternalLink className="w-4 h-4 text-(--text-muted)" />
        </a>
      ))}
    </SettingsSection>
  )
}
