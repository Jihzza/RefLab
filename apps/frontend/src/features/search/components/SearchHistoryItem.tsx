import { Surface } from '@/components/ui'
import type { SearchedUser } from '../types'
import SearchResultItem from './SearchResultItem'

interface Props {
  user: SearchedUser
  onClick?: (user: SearchedUser) => void
}

export default function SearchHistoryItem({ user, onClick }: Props) {
  const openProfile = () => {
    onClick?.(user)
  }

  return (
    <Surface padding="none" className="overflow-hidden border-(--mc-color-border-strong) shadow-none">
      <SearchResultItem user={user} onClick={openProfile} />
    </Surface>
  )
}
