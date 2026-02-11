import { useState } from 'react'

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
        className="w-9 h-9 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors"
        aria-label={`Open actions for @${username}`}
        disabled={isBusy}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-10 z-50 w-48 bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-xl overflow-hidden">
            <button
              type="button"
              onClick={() => handleAction(onToggleBlock)}
              className="w-full text-left px-4 py-3 text-sm text-(--error) hover:bg-(--bg-hover) transition-colors"
            >
              {isBlockedByViewer ? 'Unblock User' : 'Block User'}
            </button>

            <button
              type="button"
              onClick={() => handleAction(onReport)}
              className="w-full text-left px-4 py-3 text-sm text-(--text-secondary) hover:bg-(--bg-hover) transition-colors border-t border-(--border-subtle)"
            >
              Report User
            </button>

            <button
              type="button"
              onClick={() => handleAction(onShare)}
              className="w-full text-left px-4 py-3 text-sm text-(--text-secondary) hover:bg-(--bg-hover) transition-colors border-t border-(--border-subtle)"
            >
              Share Profile
            </button>

            <button
              type="button"
              onClick={() => handleAction(onCopyLink)}
              className="w-full text-left px-4 py-3 text-sm text-(--text-secondary) hover:bg-(--bg-hover) transition-colors border-t border-(--border-subtle)"
            >
              Copy Link
            </button>
          </div>
        </>
      )}
    </div>
  )
}
