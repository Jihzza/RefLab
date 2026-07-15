import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Ban, Copy, Ellipsis, Flag, Share2, UserRoundCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import IconButton from '@/components/ui/IconButton'

interface PublicProfileMenuProps {
  username: string
  isBlockedByViewer: boolean
  isBusy?: boolean
  onToggleBlock: () => void
  onReport: () => void
  onShare: () => void
  onCopyLink: () => void
}

/** Keyboard-accessible relationship and sharing actions for a public profile. */
export default function PublicProfileMenu({
  username,
  isBlockedByViewer,
  isBusy = false,
  onToggleBlock,
  onReport,
  onShare,
  onCopyLink,
}: PublicProfileMenuProps) {
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

    const currentIndex = Math.max(
      0,
      items.indexOf(document.activeElement as HTMLButtonElement),
    )
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
    'flex min-h-11 w-full items-center gap-3 rounded-(--mc-radius-compact) px-3 text-left text-sm font-medium text-(--mc-color-text-secondary) transition-colors hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text) focus-visible:outline-none focus-visible:bg-(--mc-color-surface-hover) focus-visible:text-(--mc-color-text) motion-reduce:transition-none'

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
        label={t('Open actions for @{{username}}', { username })}
        loading={isBusy}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Ellipsis className="size-5" />
      </IconButton>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t('Profile actions')}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-[calc(100%+0.25rem)] z-30 w-56 overflow-hidden rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) p-1 shadow-(--mc-shadow-raised)"
        >
          <button
            type="button"
            role="menuitem"
            data-menu-item=""
            onClick={() => handleAction(onToggleBlock)}
            className={`${itemClassName} ${
              isBlockedByViewer
                ? 'text-(--mc-color-success) hover:text-(--mc-color-success)'
                : 'text-(--mc-color-danger) hover:text-(--mc-color-danger)'
            }`}
          >
            {isBlockedByViewer ? (
              <UserRoundCheck className="size-4" aria-hidden="true" />
            ) : (
              <Ban className="size-4" aria-hidden="true" />
            )}
            {isBlockedByViewer ? t('Unblock User') : t('Block User')}
          </button>

          <button
            type="button"
            role="menuitem"
            data-menu-item=""
            onClick={() => handleAction(onReport)}
            className={itemClassName}
          >
            <Flag className="size-4" aria-hidden="true" />
            {t('Report User')}
          </button>

          <div role="separator" className="my-1 border-t border-(--mc-color-border)" />

          <button
            type="button"
            role="menuitem"
            data-menu-item=""
            onClick={() => handleAction(onShare)}
            className={itemClassName}
          >
            <Share2 className="size-4" aria-hidden="true" />
            {t('Share Profile')}
          </button>

          <button
            type="button"
            role="menuitem"
            data-menu-item=""
            onClick={() => handleAction(onCopyLink)}
            className={itemClassName}
          >
            <Copy className="size-4" aria-hidden="true" />
            {t('Copy Link')}
          </button>
        </div>
      )}
    </div>
  )
}
