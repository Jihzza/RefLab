import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface SessionExpiredModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SessionExpiredModal({ isOpen, onClose }: SessionExpiredModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleLogin = () => {
    onClose()
    navigate('/')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--bg-primary)]/50" />

      {/* Modal */}
      <div className="relative bg-(--bg-surface) rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-semibold text-(--text-primary) mb-2">
          {t('Session Expired')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('Your session has expired. Please log in again to continue.')}
        </p>
        <button
          onClick={handleLogin}
          className="w-full bg-(--brand-yellow) text-(--bg-primary) py-2 px-4 rounded-lg hover:bg-(--brand-yellow-soft) transition-colors"
        >
          {t('Log In')}
        </button>
      </div>
    </div>
  )
}
