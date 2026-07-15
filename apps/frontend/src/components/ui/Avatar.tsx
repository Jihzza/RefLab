import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type ReactNode,
} from 'react'
import { cx } from './utils'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  name?: string | null
  fallback?: ReactNode
  size?: AvatarSize
  imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'size-6 text-[9px]',
  sm: 'size-8 text-[10px]',
  md: 'size-10 text-xs',
  lg: 'size-12 text-sm',
  xl: 'size-16 text-lg',
}

function getInitials(name?: string | null): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase()
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  {
    alt = '',
    className,
    fallback,
    imageProps,
    name,
    size = 'md',
    src,
    ...props
  },
  ref,
) {
  const { className: imageClassName, onError, ...restImageProps } = imageProps ?? {}
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const showImage = Boolean(src && failedSource !== src)

  return (
    <div
      ref={ref}
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) font-bold text-(--mc-color-accent)',
        sizeClasses[size],
        className,
      )}
      data-size={size}
      {...props}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          className={cx('size-full object-cover', imageClassName)}
          loading="lazy"
          onError={(event) => {
            setFailedSource(src ?? null)
            onError?.(event)
          }}
          {...restImageProps}
        />
      ) : (
        <span
          className="flex size-full items-center justify-center"
          role={alt || name ? 'img' : undefined}
          aria-label={alt || name || undefined}
        >
          {fallback ?? getInitials(name)}
        </span>
      )}
    </div>
  )
})

Avatar.displayName = 'Avatar'

export default Avatar
