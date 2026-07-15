import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Ban, Ellipsis, Flag, Trash2, UserRoundX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import IconButton from '@/components/ui/IconButton'

interface PostMenuProps {
  isOwnPost: boolean
  onReportPost: () => void
  onReportUser: () => void
  onBlockUser: () => void
  onDelete: () => void
}

/** Keyboard-accessible menu for moderation and ownership actions. */
export default function PostMenu({
  isOwnPost,
  onReportPost,
  onReportUser,
  onBlockUser,
  onDelete,
}: PostMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!isOpen) return

    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[data-menu-item]')?.focus()
    })

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setIsOpen(false)
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[data-menu-item]') ?? [],
    )
    if (items.length === 0) return

    const currentIndex = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement))
    let nextIndex: number | null = null

    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = items.length - 1

    if (nextIndex !== null) {
      event.preventDefault()
      items[nextIndex]?.focus()
    }
  }

  const itemClassName =
    'flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-medium text-(--mc-color-text-secondary) transition-colors hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text) focus-visible:outline-none focus-visible:bg-(--mc-color-surface-hover) focus-visible:text-(--mc-color-text) motion-reduce:transition-none'
  const dangerItemClassName = `${itemClassName} text-(--mc-color-danger) hover:text-(--mc-color-danger) focus-visible:text-(--mc-color-danger)`

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setIsOpen(false)
        }
      }}
    >
      <IconButton
        ref={triggerRef}
        label={t('Post options')}
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-haspopup="menu"
        onClick={() => setIsOpen((value) => !value)}
      >
        <Ellipsis className="size-5" />
      </IconButton>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t('Post options')}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-[calc(100%+0.25rem)] z-30 w-56 overflow-hidden rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) p-1 shadow-(--mc-shadow-raised)"
        >
          {isOwnPost ? (
            <button
              type="button"
              role="menuitem"
              data-menu-item=""
              onClick={() => handleAction(onDelete)}
              className={dangerItemClassName}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t('Delete Post')}
            </button>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                data-menu-item=""
                onClick={() => handleAction(onReportPost)}
                className={itemClassName}
              >
                <Flag className="size-4" aria-hidden="true" />
                {t('Report Post')}
              </button>
              <button
                type="button"
                role="menuitem"
                data-menu-item=""
                onClick={() => handleAction(onReportUser)}
                className={itemClassName}
              >
                <UserRoundX className="size-4" aria-hidden="true" />
                {t('Report User')}
              </button>
              <div role="separator" className="my-1 border-t border-(--mc-color-border)" />
              <button
                type="button"
                role="menuitem"
                data-menu-item=""
                onClick={() => handleAction(onBlockUser)}
                className={dangerItemClassName}
              >
                <Ban className="size-4" aria-hidden="true" />
                {t('Block User')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
