import { useEffect, useRef, useState } from 'react'
import { BookOpen, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/components/useAuth'
import { clearLearningHistory } from '../api/settingsApi'
import ConfirmDialog from './ConfirmDialog'
import SettingsSection from './SettingsSection'

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unexpected learning-history error')
}

export default function LearningSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
  }, [])

  const handleClear = async () => {
    if (!user?.id || loading) return

    setLoading(true)
    setError(null)

    let clearError: Error | null = null
    try {
      const result = await clearLearningHistory(user.id)
      clearError = result.error
    } catch (caughtError) {
      clearError = toError(caughtError)
    }

    if (clearError) {
      setError(clearError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setDialogOpen(false)
    setSuccess(true)

    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(() => {
      setSuccess(false)
      successTimerRef.current = null
    }, 3000)
  }

  return (
    <>
      <SettingsSection
        title={t('Learning')}
        description={t('Clear Learning History')}
        icon={<BookOpen className="size-7" />}
        grouped
      >
        <div className="px-4 py-4 sm:px-5">
          <p className="text-sm leading-6 text-(--mc-color-text-muted)">
            {t('Clear your test attempts and answers, plus streak-related notifications. This cannot be undone.')}
          </p>

          <Button
            variant="danger"
            size="md"
            leadingIcon={<Trash2 className="size-4" />}
            onClick={() => {
              setError(null)
              setDialogOpen(true)
            }}
            className="mt-4"
          >
            {t('Clear Learning History')}
          </Button>

          {success && (
            <p className="mt-3 text-sm text-(--mc-color-success)" role="status">
              {t('Learning history cleared successfully.')}
            </p>
          )}

          {error && !dialogOpen && (
            <p className="mt-3 break-words text-sm text-(--mc-color-danger)" role="alert">
              {error}
            </p>
          )}
        </div>
      </SettingsSection>

      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setError(null)
        }}
        onConfirm={handleClear}
        title={t('Clear Learning History')}
        description={t('This will permanently delete all your test attempts and answers, and remove streak-related notifications. This action cannot be undone.')}
        confirmLabel={t('Clear History')}
        variant="warning"
        loading={loading}
        error={error}
      />
    </>
  )
}
