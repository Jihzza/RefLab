import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface SessionExpiredModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SessionExpiredModal({ isOpen, onClose }: SessionExpiredModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLogin = () => {
    onClose()
    navigate('/')
  }

  // Close on Escape from anywhere in the document so keyboard-only users can
  // dismiss the modal without a focus trap.
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleLogin()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--bg-primary)]/50"
        onClick={handleLogin}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-message"
        className="relative bg-(--bg-surface) rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-(--border-subtle)"
      >
        <h2 id="session-expired-title" className="text-lg font-semibold text-(--text-primary) mb-2">
          {t('Session Expired')}
        </h2>
        <p id="session-expired-message" className="text-(--text-secondary) mb-6">
          {t('Your session has expired. Please log in again to continue.')}
        </p>
        <button
          type="button"
          onClick={handleLogin}
          className="w-full bg-(--brand-yellow) text-(--bg-primary) py-2 px-4 rounded-lg hover:bg-(--brand-yellow-soft) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-surface)"
          autoFocus
        >
          {t('Log In')}
        </button>
      </div>
    </div>
  )
}
