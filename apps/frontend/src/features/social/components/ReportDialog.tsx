import { useRef, useState, type KeyboardEvent } from 'react'
import { Flag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'

const PRESET_REASONS = ['Spam or scam', 'Harassment or bullying', 'Inappropriate content']

interface ReportDialogProps {
  type: 'post' | 'user'
  onSubmit: (reason: string) => void
  onClose: () => void
}

/** Moderation reason selector built on the shared focus-trapped dialog. */
export default function ReportDialog({ type, onSubmit, onClose }: ReportDialogProps) {
  const { t } = useTranslation()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const firstReasonRef = useRef<HTMLButtonElement>(null)
  const reason = customReason.trim() || selectedPreset || ''
  const canSubmit = reason.length > 0
  const title = type === 'post' ? t('Report Post') : t('Report User')

  const selectPreset = (preset: string) => {
    setSelectedPreset(preset)
    setCustomReason('')
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
    const nextPreset = PRESET_REASONS[nextIndex]
    if (!nextPreset) return
    selectPreset(nextPreset)
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      .item(nextIndex)
      .focus()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={title}
      description={t('Why are you reporting this {{type}}?', { type })}
      initialFocusRef={firstReasonRef}
      size="sm"
      overlayClassName="backdrop-blur-sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={!canSubmit}
            leadingIcon={<Flag className="size-4" />}
            onClick={() => {
              if (canSubmit) onSubmit(reason)
            }}
          >
            {t('Submit Report')}
          </Button>
        </>
      )}
    >
      <div role="radiogroup" aria-label={title} className="space-y-2">
        {PRESET_REASONS.map((preset, index) => {
          const selected = selectedPreset === preset
          return (
            <button
              key={preset}
              ref={index === 0 ? firstReasonRef : undefined}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selectedPreset ? (selected ? 0 : -1) : (index === 0 ? 0 : -1)}
              onClick={() => selectPreset(preset)}
              onKeyDown={(event) => handlePresetKeyDown(event, index)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-(--mc-radius-input) border px-4 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none ${
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
              {t(preset)}
            </button>
          )
        })}
      </div>

      <label className="mt-4 block">
        <span className="sr-only">{t('Describe the issue...')}</span>
        <textarea
          value={customReason}
          onChange={(event) => {
            setCustomReason(event.target.value)
            if (event.target.value.trim()) setSelectedPreset(null)
          }}
          placeholder={t('Describe the issue...')}
          rows={4}
          className="w-full resize-y rounded-(--mc-radius-input) border border-(--mc-color-border-strong) bg-(--mc-color-canvas) px-4 py-3 text-sm text-(--mc-color-text) placeholder:text-(--mc-color-text-muted) focus:border-(--mc-color-accent) focus:outline-none focus:ring-2 focus:ring-(--mc-color-accent)/20"
        />
      </label>
    </Dialog>
  )
}
