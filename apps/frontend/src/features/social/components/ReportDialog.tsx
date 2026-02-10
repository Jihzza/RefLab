import React, { useState } from 'react'

const PRESET_REASONS = [
  'Spam or scam',
  'Harassment or bullying',
  'Inappropriate content',
]

interface ReportDialogProps {
  type: 'post' | 'user'
  onSubmit: (reason: string) => void
  onClose: () => void
}

/** Dialog for reporting a post or user with preset or custom reasons. */
const ReportDialog: React.FC<ReportDialogProps> = ({ type, onSubmit, onClose }) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')

  const reason = customReason.trim() || selectedPreset || ''
  const canSubmit = reason.length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(reason)
  }

  const title = type === 'post' ? 'Report Post' : 'Report User'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-(--bg-primary)/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-xl pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-subtle)">
            <h2 className="text-lg font-semibold text-(--text-primary)">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-(--text-muted)">
              Why are you reporting this {type}?
            </p>

            {/* Preset reasons */}
            <div className="space-y-2">
              {PRESET_REASONS.map(preset => (
                <button
                  key={preset}
                  onClick={() => {
                    setSelectedPreset(selectedPreset === preset ? null : preset)
                    setCustomReason('')
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm rounded-(--radius-button) border transition-colors ${
                    selectedPreset === preset
                      ? 'border-(--brand-yellow) bg-(--brand-yellow)/10 text-(--text-primary)'
                      : 'border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-hover)'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom reason */}
            <textarea
              value={customReason}
              onChange={e => {
                setCustomReason(e.target.value)
                if (e.target.value.trim()) setSelectedPreset(null)
              }}
              placeholder="Describe the issue..."
              rows={3}
              className="w-full bg-(--bg-surface-2) text-(--text-primary) text-sm placeholder-(--text-muted) rounded-(--radius-input) border border-(--border-subtle) px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-(--brand-yellow)"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-(--border-subtle)">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-5 py-2 text-sm font-semibold bg-(--error) text-white rounded-(--radius-button) hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Submit Report
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ReportDialog
