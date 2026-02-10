import React from 'react'

interface BlockConfirmDialogProps {
  username: string
  onConfirm: () => void
  onClose: () => void
}

/** Confirmation dialog before blocking a user. */
const BlockConfirmDialog: React.FC<BlockConfirmDialogProps> = ({
  username,
  onConfirm,
  onClose,
}) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-(--bg-primary)/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-xs bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-xl pointer-events-auto">
          {/* Body */}
          <div className="px-5 py-6 text-center">
            <h2 className="text-lg font-semibold text-(--text-primary) mb-2">
              Block @{username}?
            </h2>
            <p className="text-sm text-(--text-muted)">
              They won't be able to see your posts and you won't see theirs.
            </p>
          </div>

          {/* Actions */}
          <div className="flex border-t border-(--border-subtle)">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-sm font-medium text-(--text-secondary) hover:bg-(--bg-hover) transition-colors border-r border-(--border-subtle)"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 text-sm font-semibold text-(--error) hover:bg-(--bg-hover) transition-colors"
            >
              Block
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default BlockConfirmDialog
