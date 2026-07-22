import { useState } from 'react'
import { Flag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog, TextArea } from '@/components/ui'

const PRESET_REASONS = ['Spam or scam', 'Harassment or bullying', 'Inappropriate content']

interface ReportDialogProps {
  type: 'post' | 'user'
  onSubmit: (reason: string) => void
  onClose: () => void
}

export default function ReportDialog({ type, onSubmit, onClose }: ReportDialogProps) {
  const { t } = useTranslation()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const reason = customReason.trim() || selectedPreset || ''
  const title = type === 'post' ? t('Report Post') : t('Report User')

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={title}
      description={t('Reports are reviewed to help keep the RefLab community safe.')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button
            variant="danger"
            leadingIcon={<Flag className="size-4" />}
            disabled={!reason}
            onClick={() => onSubmit(reason)}
          >
            {t('Submit Report')}
          </Button>
        </>
      }
    >
      <fieldset className="space-y-2">
        <legend className="mb-3 text-sm font-semibold text-(--mc-color-text-secondary)">
          {t('Why are you reporting this {{type}}?', { type })}
        </legend>
        {PRESET_REASONS.map((preset) => {
          const selected = selectedPreset === preset
          return (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setSelectedPreset(selected ? null : preset)
                setCustomReason('')
              }}
              className={`mc-focus-ring min-h-11 w-full rounded-(--mc-radius-button) border px-4 py-2.5 text-left text-sm font-medium transition-colors ${selected ? 'border-(--mc-color-danger)/60 bg-(--mc-color-danger)/10 text-(--mc-color-text)' : 'border-(--mc-color-border) text-(--mc-color-text-secondary) hover:border-(--mc-color-border-strong) hover:bg-(--mc-color-surface-hover)'}`}
              aria-pressed={selected}
            >
              {t(preset)}
            </button>
          )
        })}
      </fieldset>

      <TextArea
        label={t('Other reason')}
        value={customReason}
        onChange={(event) => {
          setCustomReason(event.target.value)
          if (event.target.value.trim()) setSelectedPreset(null)
        }}
        placeholder={t('Describe the issue...')}
        rows={3}
        className="mt-4"
      />
    </Dialog>
  )
}
