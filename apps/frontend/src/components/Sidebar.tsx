import type { MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { key: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { key: 'Tests', path: '/app/tests', icon: ClipboardList },
  { key: 'Learn', path: '/app/learn', icon: BookOpen },
  { key: 'Social', path: '/app/social', icon: Users },
  { key: 'Messages', path: '/app/messages', icon: MessageSquare },
  { key: 'Search', path: '/app/search', icon: Search },
  { key: 'Notifications', path: '/app/notifications', icon: Bell },
  { key: 'Profile', path: '/app/profile', icon: UserCircle },
  { key: 'Pricing', path: '/app/pricing', icon: CreditCard },
  { key: 'Settings', path: '/app/settings', icon: Settings },
] as const

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      onClose()
      navigate('/')
    }
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <Sheet
      side="left"
      id="app-navigation-menu"
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t('Navigation')}
      closeLabel={t('Close')}
      className="w-[min(88vw,18rem)]"
      bodyClassName="p-0"
      footer={(
        <div className="w-full">
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={t('Profile avatar')}
                    className="size-10 shrink-0 rounded-full border border-(--mc-color-border) object-cover"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--mc-color-accent)/20 font-bold text-(--mc-color-accent)">
                    {user.user_metadata?.full_name?.charAt(0).toUpperCase()
                      || user.email?.charAt(0).toUpperCase()
                      || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-(--mc-color-text)" title={user.email}>
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="truncate text-xs text-(--mc-color-text-muted)">{user.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mc-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-(--mc-radius-button) border border-(--mc-color-danger)/35 px-4 py-2 text-sm font-semibold text-(--mc-color-danger) transition-colors hover:bg-(--mc-color-danger)/10 motion-reduce:transition-none"
              >
                <LogOut className="size-4" aria-hidden="true" />
                {t('Log Out')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigation('/')}
              className="mc-focus-ring min-h-11 w-full rounded-(--mc-radius-button) bg-(--mc-color-accent) px-4 py-2 text-sm font-bold text-(--mc-color-canvas)"
            >
              {t('Log In')}
            </button>
          )}
        </div>
      )}
    >
      <nav className="space-y-1 p-4" aria-label={t('Navigation')}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
            || location.pathname.startsWith(`${item.path}/`)
            || (item.path === '/app/social' && location.pathname.startsWith('/app/post/'))

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigation(item.path)}
              aria-current={isActive ? 'page' : undefined}
              className={`mc-focus-ring flex min-h-12 w-full items-center gap-3 rounded-(--mc-radius-button) border px-4 py-3 text-left text-sm font-semibold transition-colors motion-reduce:transition-none ${
                isActive
                  ? 'border-(--mc-color-accent)/30 bg-(--mc-color-accent)/10 text-(--mc-color-accent)'
                  : 'border-transparent text-(--mc-color-text-secondary) hover:border-(--mc-color-border) hover:bg-(--mc-color-surface-hover) hover:text-(--mc-color-text)'
              }`}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span>{t(item.key)}</span>
            </button>
          )
        })}
      </nav>
    </Sheet>
  )
}

export default Sidebar
