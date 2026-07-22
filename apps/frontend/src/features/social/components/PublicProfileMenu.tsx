import { useState } from 'react'
import { Ban, Copy, Flag, MoreHorizontal, Share2, Undo2 } from 'lucide-react'
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

  const itemClassName = 'mc-focus-ring flex min-h-11 w-full items-center gap-2 rounded-(--mc-radius-compact) px-3 py-2 text-left text-sm font-medium text-(--mc-color-text-secondary) hover:bg-(--mc-color-surface-hover)'

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="mc-focus-ring inline-flex size-11 items-center justify-center rounded-(--mc-radius-button) text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
        aria-label={t('Open actions for @{{username}}', { username })}
        aria-expanded={isOpen}
        disabled={isBusy}
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          <button type="button" className="fixed inset-0 z-(--mc-z-sticky) cursor-default" onClick={() => setIsOpen(false)} aria-label={t('Close profile options')} />
          <div className="absolute right-0 top-11 z-(--mc-z-popover) min-w-52 rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) p-1 shadow-(--mc-shadow-raised)" role="menu">
            <button type="button" role="menuitem" onClick={() => handleAction(onToggleBlock)} className={`${itemClassName} text-(--mc-color-danger)`}>
              {isBlockedByViewer ? <Undo2 className="size-4" aria-hidden="true" /> : <Ban className="size-4" aria-hidden="true" />}
              {isBlockedByViewer ? t('Unblock User') : t('Block User')}
            </button>
            <button type="button" role="menuitem" onClick={() => handleAction(onReport)} className={itemClassName}>
              <Flag className="size-4" aria-hidden="true" />
              {t('Report User')}
            </button>
            <button type="button" role="menuitem" onClick={() => handleAction(onShare)} className={itemClassName}>
              <Share2 className="size-4" aria-hidden="true" />
              {t('Share Profile')}
            </button>
            <button type="button" role="menuitem" onClick={() => handleAction(onCopyLink)} className={itemClassName}>
              <Copy className="size-4" aria-hidden="true" />
              {t('Copy Link')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
