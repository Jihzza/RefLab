import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import { clearLearningHistory } from '../api/settingsApi'
import Button from '@/components/ui/Button'
import SettingsSection from './SettingsSection'
import ConfirmDialog from './ConfirmDialog'
import { useTranslation } from 'react-i18next'

export default function LearningSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClear = async () => {
    if (!user?.id) return

    setLoading(true)
    setError(null)

    const { error: clearError } = await clearLearningHistory(user.id)

    if (clearError) {
      setError(clearError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setDialogOpen(false)
    setSuccess(true)

    // Auto-dismiss success message after 3 seconds
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <>
      <SettingsSection title={t('Learning')} icon={<GraduationCap className="size-5" />}>
        <div className="bg-(--mc-color-warning)/5 px-4 py-4 sm:px-5">
          <p className="text-sm leading-6 text-(--mc-color-text-secondary)">
            {t('Clear your test history, question attempts, video watch history, streak data, and all learning progress. This cannot be undone.')}
          </p>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDialogOpen(true)}
            leadingIcon={<GraduationCap className="size-4" />}
            className="mt-3 border-(--mc-color-warning)/40 text-(--mc-color-warning) hover:bg-(--mc-color-warning)/10"
            aria-label={t('Clear Learning History')}
          >
            {t('Clear Learning History')}
          </Button>

          {success && (
            <p className="mt-2 text-xs text-(--mc-color-success)" role="status">
              {t('Learning history cleared successfully.')}
            </p>
          )}

          {error && (
            <p className="mt-2 text-xs text-(--mc-color-danger)" role="alert">
              {error}
            </p>
          )}
        </div>
      </SettingsSection>

      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleClear}
        title={t('Clear Learning History')}
        description={t('This will permanently delete all your test attempts, question progress, video history, and streak data. This action cannot be undone.')}
        confirmLabel={t('Clear History')}
        variant="warning"
        loading={loading}
      />
    </>
  )
}
