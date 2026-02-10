import React from 'react'

interface NewPostButtonProps {
  onClick: () => void
}

/** Floating action button for creating a new post. */
const NewPostButton: React.FC<NewPostButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-(--brand-yellow) shadow-lg flex items-center justify-center hover:bg-(--brand-yellow-soft) transition-colors active:scale-95"
      aria-label="Create new post"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-(--bg-primary)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  )
}

export default NewPostButton
