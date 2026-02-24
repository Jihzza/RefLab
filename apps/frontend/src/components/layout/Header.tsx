import NotificationBell from '@/features/notifications/components/NotificationBell'
import { useTranslation } from 'react-i18next'

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation()
  return (
    <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="p-2 mr-3"
          aria-label={t('Open menu')}
        >
          <span className="text-xl">☰</span>
        </button>
        <h1 className="font-bold text-lg">RefLab</h1>
      </div>

      <NotificationBell />
    </header>
  );
}
