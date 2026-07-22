import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from './utils'

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl'
export type DialogRole = 'dialog' | 'alertdialog'
export type DialogPlacement = 'center' | 'left' | 'right' | 'bottom'

export interface DialogProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'role'> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  size?: DialogSize
  dialogRole?: DialogRole
  placement?: DialogPlacement
  closeLabel?: string
  showCloseButton?: boolean
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  portalContainer?: Element | DocumentFragment | null
  overlayClassName?: string
  bodyClassName?: string
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const dialogStack: symbol[] = []
let bodyLockCount = 0
let originalBodyOverflow = ''
let originalBodyPaddingRight = ''

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.closest('[inert]') &&
      element.getClientRects().length > 0,
  )
}

function lockBodyScroll(): () => void {
  if (bodyLockCount === 0) {
    const body = document.body
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
    const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0

    originalBodyOverflow = body.style.overflow
    originalBodyPaddingRight = body.style.paddingRight
    body.style.overflow = 'hidden'

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }
  }

  bodyLockCount += 1
  let released = false

  return () => {
    if (released) return
    released = true
    bodyLockCount = Math.max(0, bodyLockCount - 1)

    if (bodyLockCount === 0) {
      document.body.style.overflow = originalBodyOverflow
      document.body.style.paddingRight = originalBodyPaddingRight
    }
  }
}

const overlayPlacementClasses: Record<DialogPlacement, string> = {
  center: 'items-center justify-center p-4',
  left: 'items-stretch justify-start',
  right: 'items-stretch justify-end',
  bottom: 'items-end justify-stretch',
}

const panelPlacementClasses: Record<DialogPlacement, string> = {
  center:
    'max-h-[calc(100dvh-2rem)] w-full rounded-(--mc-radius-card) border border-(--mc-color-border-strong)',
  left:
    'h-full w-[min(90vw,28rem)] rounded-r-(--mc-radius-card) border-r border-(--mc-color-border-strong)',
  right:
    'h-full w-[min(90vw,28rem)] rounded-l-(--mc-radius-card) border-l border-(--mc-color-border-strong)',
  bottom:
    'max-h-[min(85dvh,48rem)] w-full rounded-t-(--mc-radius-card) border-t border-(--mc-color-border-strong)',
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  {
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    bodyClassName,
    children,
    className,
    closeLabel,
    closeOnEscape = true,
    closeOnOverlayClick = true,
    description,
    dialogRole = 'dialog',
    footer,
    initialFocusRef,
    onKeyDown,
    onOpenChange,
    open,
    overlayClassName,
    placement = 'center',
    portalContainer,
    showCloseButton = true,
    size = 'md',
    title,
    ...props
  },
  forwardedRef,
) {
  const { t } = useTranslation()
  const generatedId = useId()
  const titleId = `dialog-${generatedId}-title`
  const descriptionId = description ? `dialog-${generatedId}-description` : undefined
  const resolvedDescriptionIds = [ariaDescribedBy, descriptionId].filter(Boolean).join(' ') || undefined
  const panelRef = useRef<HTMLDivElement>(null)
  const instanceId = useRef(Symbol('dialog')).current
  const onOpenChangeRef = useRef(onOpenChange)
  const closeOnEscapeRef = useRef(closeOnEscape)
  const initialFocusRefRef = useRef(initialFocusRef)

  onOpenChangeRef.current = onOpenChange
  closeOnEscapeRef.current = closeOnEscape
  initialFocusRefRef.current = initialFocusRef

  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const unlockBodyScroll = lockBodyScroll()
    dialogStack.push(instanceId)

    const focusFrame = window.requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel || dialogStack.at(-1) !== instanceId) return

      const requestedFocus = initialFocusRefRef.current?.current
      const firstFocusable = getFocusableElements(panel)[0]
      const focusTarget = requestedFocus && panel.contains(requestedFocus)
        ? requestedFocus
        : (firstFocusable ?? panel)
      focusTarget.focus({ preventScroll: true })
    })

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current
      if (
        event.key === 'Tab' &&
        !event.defaultPrevented &&
        dialogStack.at(-1) === instanceId &&
        panel &&
        !panel.contains(document.activeElement)
      ) {
        const focusableElements = getFocusableElements(panel)
        event.preventDefault()
        const focusTarget = event.shiftKey
          ? focusableElements.at(-1)
          : focusableElements[0]
        ;(focusTarget ?? panel).focus({ preventScroll: true })
        return
      }

      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        !closeOnEscapeRef.current ||
        dialogStack.at(-1) !== instanceId
      ) {
        return
      }

      event.preventDefault()
      event.stopImmediatePropagation()
      onOpenChangeRef.current(false)
    }

    const handleDocumentFocusIn = (event: FocusEvent) => {
      const panel = panelRef.current
      if (
        dialogStack.at(-1) !== instanceId ||
        !panel ||
        !(event.target instanceof Node) ||
        panel.contains(event.target)
      ) {
        return
      }

      const focusTarget = getFocusableElements(panel)[0] ?? panel
      focusTarget.focus({ preventScroll: true })
    }

    document.addEventListener('keydown', handleDocumentKeyDown)
    document.addEventListener('focusin', handleDocumentFocusIn)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleDocumentKeyDown)
      document.removeEventListener('focusin', handleDocumentFocusIn)
      const stackIndex = dialogStack.lastIndexOf(instanceId)
      if (stackIndex >= 0) dialogStack.splice(stackIndex, 1)
      unlockBodyScroll()

      if (previouslyFocused?.isConnected) {
        window.requestAnimationFrame(() => previouslyFocused.focus({ preventScroll: true }))
      }
    }
  }, [instanceId, open])

  function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.key !== 'Tab' || dialogStack.at(-1) !== instanceId) {
      return
    }

    const panel = panelRef.current
    if (!panel) return
    const focusableElements = getFocusableElements(panel)

    if (focusableElements.length === 0) {
      event.preventDefault()
      panel.focus({ preventScroll: true })
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements.at(-1)
    const activeElement = document.activeElement

    if (event.shiftKey && (activeElement === firstElement || !panel.contains(activeElement))) {
      event.preventDefault()
      lastElement?.focus()
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement?.focus()
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className={cx(
        'fixed inset-0 z-(--mc-z-backdrop) flex bg-(--mc-color-overlay)',
        overlayPlacementClasses[placement],
        overlayClassName,
      )}
      onPointerDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
          onOpenChangeRef.current(false)
        }
      }}
      data-dialog-overlay=""
    >
      <div
        ref={(node) => {
          panelRef.current = node
          if (typeof forwardedRef === 'function') forwardedRef(node)
          else if (forwardedRef) forwardedRef.current = node
        }}
        role={dialogRole}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : (ariaLabelledBy ?? titleId)}
        aria-describedby={resolvedDescriptionIds}
        tabIndex={-1}
        className={cx(
          'relative z-(--mc-z-dialog) flex min-h-0 flex-col overflow-hidden bg-(--mc-color-surface) text-(--mc-color-text) shadow-(--mc-shadow-raised) outline-none',
          panelPlacementClasses[placement],
          placement === 'center' && sizeClasses[size],
          className,
        )}
        onKeyDown={handlePanelKeyDown}
        data-dialog-content=""
        data-placement={placement}
        {...props}
      >
        <div
          className={cx(
            'flex shrink-0 items-start gap-4 border-b border-(--mc-color-border) px-5 py-4',
            placement !== 'center' && 'mc-sheet-safe-header',
          )}
        >
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold leading-tight text-(--mc-color-text)">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm leading-5 text-(--mc-color-text-muted)">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-(--mc-radius-button) text-xl leading-none text-(--mc-color-text-muted) transition-colors hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus) motion-reduce:transition-none"
              aria-label={closeLabel ?? t('Close')}
              onClick={() => onOpenChangeRef.current(false)}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          className={cx(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain p-5',
            placement !== 'center' && 'mc-sheet-safe-body',
            placement !== 'center' && !footer && 'mc-sheet-safe-body--terminal',
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={cx(
              'flex shrink-0 flex-wrap justify-end gap-3 border-t border-(--mc-color-border) px-5 py-4',
              placement !== 'center' && 'mc-sheet-safe-footer',
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    portalContainer ?? document.body,
  )
})

Dialog.displayName = 'Dialog'

export default Dialog
