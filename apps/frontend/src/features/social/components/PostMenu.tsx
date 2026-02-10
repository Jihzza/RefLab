import React, { useState } from 'react'

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
  const [isOpen, setIsOpen] = useState(false)

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-(--bg-hover) transition-colors text-(--text-muted)"
        aria-label="Post options"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
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
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-8 z-50 w-48 bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-xl overflow-hidden">
            {isOwnPost ? (
              <button
                onClick={() => handleAction(onDelete)}
                className="w-full text-left px-4 py-3 text-sm text-(--error) hover:bg-(--bg-hover) transition-colors"
              >
                Delete Post
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleAction(onReportPost)}
                  className="w-full text-left px-4 py-3 text-sm text-(--text-secondary) hover:bg-(--bg-hover) transition-colors"
                >
                  Report Post
                </button>
                <button
                  onClick={() => handleAction(onReportUser)}
                  className="w-full text-left px-4 py-3 text-sm text-(--text-secondary) hover:bg-(--bg-hover) transition-colors border-t border-(--border-subtle)"
                >
                  Report User
                </button>
                <button
                  onClick={() => handleAction(onBlockUser)}
                  className="w-full text-left px-4 py-3 text-sm text-(--error) hover:bg-(--bg-hover) transition-colors border-t border-(--border-subtle)"
                >
                  Block User
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
