import { formatMatchNavigationBadge } from './navigation'

interface NavigationBadgeProps {
  count: number
  className: string
}

export default function NavigationBadge({
  count,
  className,
}: NavigationBadgeProps) {
  if (count <= 0) return null

  return (
    <span className={className} aria-hidden="true">
      {formatMatchNavigationBadge(count)}
    </span>
  )
}
