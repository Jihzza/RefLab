import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface NewPostButtonProps {
  onClick: () => void
  expanded?: boolean
}

/** Floating action button for creating a new post. */
export default function NewPostButton({ onClick, expanded = false }: NewPostButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed right-[calc(var(--mc-safe-right)+1rem)] bottom-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom)+1rem)] z-(--mc-z-popover) flex size-14 items-center justify-center overflow-hidden rounded-full border border-(--mc-color-accent-soft)/45 bg-(--mc-color-accent) text-(--mc-color-canvas) shadow-(--mc-shadow-raised) transition-[background-color,box-shadow,transform] duration-150 hover:bg-(--mc-color-accent-soft) hover:shadow-[0_16px_34px_rgba(0,0,0,0.34)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) focus-visible:ring-offset-2 focus-visible:ring-offset-(--mc-color-canvas) motion-reduce:transform-none motion-reduce:transition-none sm:size-16 md:right-[max(1.5rem,calc(50vw-22.25rem))] md:bottom-6 xl:right-[max(1.5rem,calc(50vw-27.75rem))]"
      aria-label={t('Create new post')}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-controls="create-post-dialog"
    >
      <Plus className="relative z-10 size-7 stroke-[2.5] sm:size-8" aria-hidden="true" />
      <span
        className="pointer-events-none absolute -right-0.5 -bottom-2 h-8 w-2.5 -skew-x-[24deg] bg-(--mc-color-danger)"
        aria-hidden="true"
      />
    </button>
  )
}
