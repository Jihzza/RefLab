import { useRef, useState, type KeyboardEvent } from 'react'
import { AlertTriangle, Flag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { REPORT_DETAILS_MAX_LENGTH } from '../config'
import type {
  ReportableType,
  ReportReasonCode,
  ReportSubmission,
  ReportSubmissionResult,
} from '../types'

const PRESET_REASONS: readonly {
  code: ReportReasonCode
  label: string
}[] = [
  { code: 'spam_scam', label: 'Spam or scam' },
  { code: 'harassment_bullying', label: 'Harassment or bullying' },
  { code: 'inappropriate_content', label: 'Inappropriate content' },
  { code: 'other', label: 'Other' },
]

interface ReportDialogProps {
  type: ReportableType
  onSubmit: (
    submission: ReportSubmission,
  ) => Promise<ReportSubmissionResult> | ReportSubmissionResult
  onClose: () => void
}

function getDialogTitle(type: ReportableType, translate: (key: string) => string): string {
  if (type === 'post') return translate('Report Post')
  if (type === 'comment') return translate('Report Comment')
  return translate('Report User')
}

/** Private, bounded report composer backed by the idempotent report RPCs. */
export default function ReportDialog({ type, onSubmit, onClose }: ReportDialogProps) {
  const { t } = useTranslation()
  const [selectedReason, setSelectedReason] = useState<ReportReasonCode | null>(null)
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstReasonRef = useRef<HTMLButtonElement>(null)
  const normalizedDetails = details.trim()
  const canSubmit = Boolean(
    selectedReason
    && (selectedReason !== 'other' || normalizedDetails),
  ) && !isSubmitting
  const title = getDialogTitle(type, t)

  const selectReason = (reason: ReportReasonCode) => {
    setSelectedReason(reason)
    setError(null)
  }

  const handlePresetKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = (index + 1) % PRESET_REASONS.length
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + PRESET_REASONS.length) % PRESET_REASONS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = PRESET_REASONS.length - 1
    }

    if (nextIndex === null) return
    event.preventDefault()
    const nextReason = PRESET_REASONS[nextIndex]
    if (!nextReason) return
    selectReason(nextReason.code)
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      .item(nextIndex)
      .focus()
  }

  const handleSubmit = async () => {
    if (!selectedReason || !canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await onSubmit({
        reasonCode: selectedReason,
        reasonDetails: normalizedDetails || null,
      })

      if (result.error) {
        setError(result.error.message)
        return
      }

      onClose()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('Could not submit this report.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
      title={title}
      description={t('Why are you reporting this {{type}}?', { type })}
      initialFocusRef={firstReasonRef}
      size="sm"
      closeOnEscape={!isSubmitting}
      closeOnOverlayClick={!isSubmitting}
      showCloseButton={!isSubmitting}
      overlayClassName="backdrop-blur-sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('Cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={!canSubmit}
            loading={isSubmitting}
            loadingText={t('Submitting...')}
            leadingIcon={<Flag className="size-4" />}
            onClick={() => void handleSubmit()}
          >
            {t('Submit Report')}
          </Button>
        </>
      )}
    >
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-(--mc-radius-input) border border-(--mc-color-danger)/40 bg-(--mc-color-danger)/10 px-3 py-2.5 text-sm leading-5 text-(--mc-color-danger)"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="break-words">{error}</span>
        </div>
      )}

      <div role="radiogroup" aria-label={title} className="space-y-2">
        {PRESET_REASONS.map((reason, index) => {
          const selected = selectedReason === reason.code
          return (
            <button
              key={reason.code}
              ref={index === 0 ? firstReasonRef : undefined}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selectedReason ? (selected ? 0 : -1) : (index === 0 ? 0 : -1)}
              disabled={isSubmitting}
              onClick={() => selectReason(reason.code)}
              onKeyDown={(event) => handlePresetKeyDown(event, index)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-(--mc-radius-input) border px-4 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${
                selected
                  ? 'border-(--mc-color-accent) bg-(--mc-color-accent)/10 text-(--mc-color-text)'
                  : 'border-(--mc-color-border) bg-(--mc-color-canvas) text-(--mc-color-text-secondary) hover:border-(--mc-color-border-strong) hover:bg-(--mc-color-surface-hover)'
              }`}
            >
              <span
                className={`size-3 shrink-0 rounded-full border ${
                  selected
                    ? 'border-(--mc-color-accent) bg-(--mc-color-accent) shadow-[0_0_0_3px_rgb(246_194_28_/_18%)]'
                    : 'border-(--mc-color-border-strong)'
                }`}
                aria-hidden="true"
              />
              {t(reason.label)}
            </button>
          )
        })}
      </div>

      <label className="mt-4 block" htmlFor="report-reason-details">
        <span className="mb-1.5 block text-sm font-medium text-(--mc-color-text-secondary)">
          {selectedReason === 'other'
            ? t('Details (required)')
            : t('Additional details (optional)')}
        </span>
        <textarea
          id="report-reason-details"
          value={details}
          onChange={(event) => {
            setDetails(event.target.value)
            setError(null)
          }}
          placeholder={t('Describe the issue...')}
          rows={4}
          maxLength={REPORT_DETAILS_MAX_LENGTH}
          disabled={isSubmitting}
          required={selectedReason === 'other'}
          aria-describedby="report-reason-counter"
          className="w-full resize-y rounded-(--mc-radius-input) border border-(--mc-color-border-strong) bg-(--mc-color-canvas) px-4 py-3 text-sm text-(--mc-color-text) placeholder:text-(--mc-color-text-muted) focus:border-(--mc-color-accent) focus:outline-none focus:ring-2 focus:ring-(--mc-color-accent)/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>
      <p
        id="report-reason-counter"
        className="mt-1 text-right text-xs tabular-nums text-(--mc-color-text-muted)"
        aria-live="polite"
        aria-atomic="true"
      >
        {details.length} / {REPORT_DETAILS_MAX_LENGTH}
      </p>
    </Dialog>
  )
}
