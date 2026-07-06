import React from 'react'
import { useTranslation } from 'react-i18next'

interface NewPostButtonProps {
  onClick: () => void
}

/** Floating action button for creating a new post. */
const NewPostButton: React.FC<NewPostButtonProps> = ({ onClick }) => {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      style={{ backgroundImage: 'var(--grad-brand)' }}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full glow-brand flex items-center justify-center transition-[transform,filter] duration-150 hover:brightness-105 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-yellow) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-primary)"
      aria-label={t('Create new post')}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-(--bg-primary)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  )
}

export default NewPostButton
