import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      // Siempre cerrar el sidebar y redirigir, incluso si falla la red
      onClose();
      navigate('/');
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-(--bg-primary)/50 z-30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-16 left-0 ${user ? 'bottom-16' : 'bottom-0'} w-64 bg-(--bg-surface) border-r border-(--border-subtle) shadow-xl z-60 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar"
      >
        {/* Navigation Links (Top) */}
        <div className="p-4 grow overflow-y-auto">
          <nav className="space-y-1">
            <button onClick={() => handleNavigation('/app/dashboard')} className="w-full text-left px-4 py-3 text-(--text-secondary) hover:bg-(--bg-surface-2) hover:text-(--text-primary) rounded-(--radius-button) transition-colors flex items-center gap-3 font-medium">
              <span>Dashboard</span>
            </button>
            <button onClick={() => handleNavigation('/app/tests')} className="w-full text-left px-4 py-3 text-(--text-secondary) hover:bg-(--bg-surface-2) hover:text-(--text-primary) rounded-(--radius-button) transition-colors flex items-center gap-3 font-medium">
              <span>Tests</span>
            </button>
            <button onClick={() => handleNavigation('/app/learn')} className="w-full text-left px-4 py-3 text-(--text-secondary) hover:bg-(--bg-surface-2) hover:text-(--text-primary) rounded-(--radius-button) transition-colors flex items-center gap-3 font-medium">
              <span>Learn</span>
            </button>
            <button onClick={() => handleNavigation('/app/notifications')} className="w-full text-left px-4 py-3 text-(--text-secondary) hover:bg-(--bg-surface-2) hover:text-(--text-primary) rounded-(--radius-button) transition-colors flex items-center gap-3 font-medium">
              <span>Notifications</span>
            </button>
            <button onClick={() => handleNavigation('/app/billing')} className="w-full text-left px-4 py-3 text-(--text-secondary) hover:bg-(--bg-surface-2) hover:text-(--text-primary) rounded-(--radius-button) transition-colors flex items-center gap-3 font-medium">
              <span>Billing</span>
            </button>
          </nav>
        </div>

        {/* User Profile & Logout (Bottom) */}
        <div className="p-4 border-t border-(--border-subtle) bg-(--bg-surface-2)">
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                {user.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full object-cover border border-(--border-subtle)"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-(--brand-yellow)/20 flex items-center justify-center text-(--brand-yellow) font-bold shrink-0">
                    {user.user_metadata?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-(--text-primary) truncate" title={user.email}>
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs text-(--text-muted) truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-(--error) hover:bg-(--error)/10 rounded-(--radius-button) transition-colors border border-(--error)/20 hover:border-(--error)/40 text-sm font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          ) : (
             <div className="flex flex-col gap-3">
                <p className="text-sm text-(--text-muted) px-1">Invitado</p>
                <button 
                  onClick={() => handleNavigation('/login')} 
                  className="w-full px-4 py-2 bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors text-sm font-bold"
                >
                  Iniciar Sesión
                </button>
             </div>
          )}
        </div>
      </aside>
    </>
  );
};
