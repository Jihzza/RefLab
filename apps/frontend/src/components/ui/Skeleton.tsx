import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'
import { cx } from './utils'

export type SkeletonVariant = 'text' | 'circular' | 'rectangular'

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  variant?: SkeletonVariant
  width?: CSSProperties['width']
  height?: CSSProperties['height']
}

const variantClasses: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded-md',
  circular: 'aspect-square rounded-full',
  rectangular: 'rounded-(--mc-radius-card)',
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, height, style, variant = 'rectangular', width, ...props },
  ref,
) {
  const defaultWidth = variant === 'circular' ? '2.5rem' : '100%'
  const defaultHeight = variant === 'rectangular' ? '6rem' : undefined

  return (
    <div
      ref={ref}
      className={cx(
        'animate-pulse bg-(--mc-color-surface-raised) motion-reduce:animate-none',
        variantClasses[variant],
        className,
      )}
      style={{ width: width ?? defaultWidth, height: height ?? defaultHeight, ...style }}
      aria-hidden="true"
      data-variant={variant}
      {...props}
    />
  )
})

Skeleton.displayName = 'Skeleton'

export default Skeleton
