import React, { useState } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'

const PRESET_REASONS = ['Spam or scam', 'Harassment or bullying', 'Inappropriate content']

interface ReportDialogProps {
  type: 'post' | 'user'
  onSubmit: (reason: string) => void
  onClose: () => void
}

/** Dialog for reporting a post or user with preset or custom reasons. */
const ReportDialog: React.FC<ReportDialogProps> = ({ type, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')

  const reason = customReason.trim() || selectedPreset || ''
  const canSubmit = reason.length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(reason)
  }

  const title = type === 'post' ? t('Report Post') : t('Report User')

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-(--bg-base)/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
          className="card-console w-full max-w-sm shadow-[var(--shadow-pop)] pointer-events-auto animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-subtle)">
            <h2 id="report-dialog-title" className="text-lg font-bold text-(--text-primary)">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
              aria-label={t('Close')}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-(--text-muted)">
              {t('Why are you reporting this {{type}}?', { type })}
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
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-(--radius-button) border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface) ${
                    selectedPreset === preset
                      ? 'border-(--brand-yellow) bg-(--brand-yellow)/10 text-(--text-primary)'
                      : 'border-(--border-subtle) text-(--text-secondary) hover:bg-(--bg-hover) hover:border-(--border-strong)'
                  }`}
                >
                  {t(preset)}
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
              placeholder={t('Describe the issue...')}
              rows={3}
              className="w-full bg-(--bg-surface-2) text-(--text-primary) text-sm placeholder-(--text-faint) rounded-(--radius-input) border border-(--border-subtle) px-4 py-3 resize-none transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-(--brand-yellow) focus:shadow-[0_0_0_3px_rgba(246,194,28,0.16)]"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-(--border-subtle)">
            <Button variant="ghost" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button variant="danger" onClick={handleSubmit} disabled={!canSubmit}>
              {t('Submit Report')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ReportDialog
