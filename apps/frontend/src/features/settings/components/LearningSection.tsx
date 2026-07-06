import { useState } from 'react'
import { GraduationCap, Trash2 } from 'lucide-react'
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
      <SettingsSection title={t('Learning')} icon={<GraduationCap className="w-4.5 h-4.5" aria-hidden="true" />}>
        <div className="px-4 py-3.5">
          <p className="text-sm text-(--text-secondary) mb-3">
            {t('Clear your test history, question attempts, video watch history, streak data, and all learning progress. This cannot be undone.')}
          </p>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" aria-hidden="true" />}
            onClick={() => setDialogOpen(true)}
            aria-label={t('Clear Learning History')}
            className="!border-(--error)/25 !text-(--error) hover:!bg-(--error)/10"
          >
            {t('Clear Learning History')}
          </Button>

          {success && (
            <p className="text-xs text-(--success) mt-2" role="status">
              {t('Learning history cleared successfully.')}
            </p>
          )}

          {error && (
            <p className="text-xs text-(--error) mt-2" role="alert">
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
