import { PenLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface NewPostButtonProps {
  onClick: () => void
}

export default function NewPostButton({ onClick }: NewPostButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="mc-focus-ring absolute bottom-4 right-4 z-(--mc-z-sticky) inline-flex min-h-12 items-center justify-center gap-2 rounded-(--mc-radius-pill) bg-(--mc-color-accent) px-3.5 font-bold text-(--mc-color-canvas) shadow-(--mc-shadow-raised) transition-[background-color,transform] hover:bg-(--mc-color-accent-soft) active:translate-y-0.5 sm:px-4"
      aria-label={t('Create new post')}
    >
      <PenLine className="size-5" aria-hidden="true" />
      <span className="hidden text-sm sm:inline">{t('New Post')}</span>
    </button>
  )
}
