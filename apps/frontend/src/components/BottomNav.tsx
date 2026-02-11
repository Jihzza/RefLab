import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/components/useAuth';
import { getTotalUnreadCount } from '@/features/messages/api/messagesApi';

/**
 * Props for individual navigation items
 */
interface BottomNavItemProps {
  title: string;
  icon: React.ReactNode;
  to: string;
  badge?: number;
}

/**
 * BottomNavItem Component
 * Renders a single navigation link with an icon and title.
 * Uses NavLink for active state styling.
 */
const BottomNavItem: React.FC<BottomNavItemProps> = ({ title, icon, to, badge }) => {
  const displayBadge = (badge ?? 0) > 99 ? '99+' : String(badge ?? 0);

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${
          isActive ? 'text-(--brand-yellow)' : 'text-(--text-muted) hover:text-(--text-secondary)'
        }`
      }
      aria-label={title}
    >
      <div className="relative">
        {icon}
        {(badge ?? 0) > 0 && (
          <span className="absolute -top-1 -right-3 min-w-5 h-5 px-1 rounded-full bg-(--brand-yellow) text-(--bg-primary) text-[10px] font-bold flex items-center justify-center">
            {displayBadge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium mt-1">{title}</span>
    </NavLink>
  );
};

/**
 * Icons (Simple SVG Stubs)
 */
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const MessagesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 8.25h9m-9 3H12m-9 6l3.36-1.68c.32-.16.53-.49.53-.85V6.75A2.25 2.25 0 019.64 4.5h8.11A2.25 2.25 0 0120 6.75v6A2.25 2.25 0 0117.75 15H9.54c-.35 0-.69.08-1 .23L3 18.75z" />
  </svg>
);

const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LearnIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 17.5 5s3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const SocialIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
);

/**
 * BottomNav Component
 * Fixed navigation bar at the bottom of the screen.
 * Layout: 5 equal columns (20% each).
 * 
 * Note: This component is only rendered when user is authenticated (handled in Layout.tsx)
 */
export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    (async () => {
      const { data, error } = await getTotalUnreadCount(user.id);
      if (cancelled) return;

      if (error) {
        console.error('Failed to fetch total unread messages:', error);
        return;
      }

      setUnreadCount(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 w-full h-16 bg-(--bg-surface) border-t border-(--border-subtle) flex justify-between items-center z-50 pb-safe">
      <div className="w-full h-full grid grid-cols-5">
        <BottomNavItem
          title="Learn"
          icon={<LearnIcon />}
          to="/app/learn"
        />
        <BottomNavItem
          title="Dashboard"
          icon={<DashboardIcon />}
          to="/app/dashboard"
        />
        <BottomNavItem
          title="Social"
          icon={<SocialIcon />}
          to="/app/social"
        />
        <BottomNavItem
          title="Messages"
          icon={<MessagesIcon />}
          to="/app/messages"
          badge={unreadCount}
        />
        <BottomNavItem
          title="Profile"
          icon={<ProfileIcon />}
          to="/app/profile"
        />
      </div>
    </nav>
  );
};

export default BottomNav;
