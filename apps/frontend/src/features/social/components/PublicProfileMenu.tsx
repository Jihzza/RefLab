import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PublicProfileMenuProps {
  username: string
  isBlockedByViewer: boolean
  isBusy?: boolean
  onToggleBlock: () => void
  onReport: () => void
  onShare: () => void
  onCopyLink: () => void
}

export default function PublicProfileMenu({
  username,
  isBlockedByViewer,
  isBusy = false,
  onToggleBlock,
  onReport,
  onShare,
  onCopyLink,
}: PublicProfileMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
        aria-label={t('Open actions for @{{username}}', { username })}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isBusy}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div role="menu" className="absolute right-0 top-11 z-50 w-48 card-console shadow-[var(--shadow-pop)] overflow-hidden p-1 animate-scale-in">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onToggleBlock)}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-(--error) rounded-(--radius-button) hover:bg-(--error)/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-yellow)"
            >
              {isBlockedByViewer ? t('Unblock User') : t('Block User')}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onReport)}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-(--text-secondary) rounded-(--radius-button) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-yellow)"
            >
              {t('Report User')}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onShare)}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-(--text-secondary) rounded-(--radius-button) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-yellow)"
            >
              {t('Share Profile')}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onCopyLink)}
              className="w-full text-left px-3 py-2.5 text-sm font-medium text-(--text-secondary) rounded-(--radius-button) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-yellow)"
            >
              {t('Copy Link')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
