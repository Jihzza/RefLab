import { useState } from 'react'
import { Ban, Flag, MoreHorizontal, Trash2, UserRoundX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PostMenuProps {
  isOwnPost: boolean
  onReportPost: () => void
  onReportUser: () => void
  onBlockUser: () => void
  onDelete: () => void
}

export default function PostMenu({
  isOwnPost,
  onReportPost,
  onReportUser,
  onBlockUser,
  onDelete,
}: PostMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  const itemClassName = 'mc-focus-ring flex min-h-11 w-full items-center gap-2 rounded-(--mc-radius-compact) px-3 py-2 text-left text-sm font-medium hover:bg-(--mc-color-surface-hover)'

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="mc-focus-ring inline-flex size-11 items-center justify-center rounded-(--mc-radius-button) text-(--mc-color-text-muted) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)"
        aria-label={t('Post options')}
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          <button type="button" className="fixed inset-0 z-(--mc-z-sticky) cursor-default" onClick={() => setIsOpen(false)} aria-label={t('Close post options')} />
          <div className="absolute right-0 top-11 z-(--mc-z-popover) min-w-52 overflow-hidden rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) p-1 shadow-(--mc-shadow-raised)" role="menu">
            {isOwnPost ? (
              <button type="button" role="menuitem" onClick={() => handleAction(onDelete)} className={`${itemClassName} text-(--mc-color-danger)`}>
                <Trash2 className="size-4" aria-hidden="true" />
                {t('Delete Post')}
              </button>
            ) : (
              <>
                <button type="button" role="menuitem" onClick={() => handleAction(onReportPost)} className={`${itemClassName} text-(--mc-color-text-secondary)`}>
                  <Flag className="size-4" aria-hidden="true" />
                  {t('Report Post')}
                </button>
                <button type="button" role="menuitem" onClick={() => handleAction(onReportUser)} className={`${itemClassName} text-(--mc-color-text-secondary)`}>
                  <UserRoundX className="size-4" aria-hidden="true" />
                  {t('Report User')}
                </button>
                <button type="button" role="menuitem" onClick={() => handleAction(onBlockUser)} className={`${itemClassName} text-(--mc-color-danger)`}>
                  <Ban className="size-4" aria-hidden="true" />
                  {t('Block User')}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
