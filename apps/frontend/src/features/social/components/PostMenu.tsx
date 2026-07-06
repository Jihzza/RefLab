import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PostMenuProps {
  isOwnPost: boolean
  onReportPost: () => void
  onReportUser: () => void
  onBlockUser: () => void
  onDelete: () => void
}

/** 3-dot dropdown menu for post actions (report, block, delete). */
const PostMenu: React.FC<PostMenuProps> = ({
  isOwnPost,
  onReportPost,
  onReportUser,
  onBlockUser,
  onDelete,
}) => {
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
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-(--bg-hover) transition-colors text-(--text-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
        aria-label={t('Post options')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div role="menu" className="absolute right-0 top-9 z-50 w-48 card-console shadow-[var(--shadow-pop)] overflow-hidden p-1 animate-scale-in">
            {isOwnPost ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleAction(onDelete)}
                className="w-full text-left px-3 py-2.5 text-sm font-medium text-(--error) rounded-(--radius-button) hover:bg-(--error)/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-yellow)"
              >
                {t('Delete Post')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleAction(onReportPost)}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-(--text-secondary) rounded-(--radius-button) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-yellow)"
                >
                  {t('Report Post')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleAction(onReportUser)}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-(--text-secondary) rounded-(--radius-button) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-yellow)"
                >
                  {t('Report User')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleAction(onBlockUser)}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium text-(--error) rounded-(--radius-button) hover:bg-(--error)/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--brand-yellow)"
                >
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

export default PostMenu
