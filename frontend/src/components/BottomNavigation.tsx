import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationItem {
  id: string;
  icon: React.FC<{ className?: string; strokeWidth?: number; color?: string; style?: React.CSSProperties }>;
  path: string;
}

const HomeIcon: React.FC<any> = ({ className, strokeWidth = 2, color = "currentColor" }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 10l8-7 8 7v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <line x1="9.5" y1="18" x2="14.5" y2="18" />
  </svg>
);

const HeartIcon: React.FC<any> = ({ className, strokeWidth = 2, color = "currentColor" }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.88 5.12a5.5 5.5 0 0 0-7.78 0L12 6.23l-1.1-1.11a5.5 5.5 0 0 0-7.78 7.78l1.1 1.11L12 21.78l7.78-7.78 1.1-1.11a5.5 5.5 0 0 0 0-7.77z" />
  </svg>
);

const FeedbackIcon: React.FC<any> = ({ className, strokeWidth = 2, color = "currentColor" }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 19v-1a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v1" />
    <circle cx="10" cy="9" r="3" />
    <path d="M14 6h4.5a2 2 0 0 1 2 2v2.5a2 2 0 0 1-2 2h-.5L15 15.5v-3h-1a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
  </svg>
);

const UserIcon: React.FC<any> = ({ className, strokeWidth = 2, color = "currentColor" }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M6 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
  </svg>
);

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems: NavigationItem[] = [
    { id: 'home', icon: HomeIcon, path: '/' },
    { id: 'favorites', icon: HeartIcon, path: '/favorites' },
    { id: 'feedback', icon: FeedbackIcon, path: '/feedback' },
    { id: 'profile', icon: UserIcon, path: '/profile' },
  ];

  const getActiveItem = () => {
    const path = location.pathname;
    const item = navigationItems.find(item => item.path === path);
    return item ? item.id : 'home';
  };

  const activeItem = getActiveItem();
  const activeIndex = Math.max(0, navigationItems.findIndex(item => item.id === activeItem));

  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all"
      style={{ width: 'min(92%, 360px)' }}
    >
      <div
        className="relative flex items-center w-full h-[68px] rounded-[34px] bg-[#050505] dark:bg-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_32px_rgba(255,255,255,0.1)]"
      >
        {/* Sliding Indicator */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 bg-white dark:bg-black rounded-[26px] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{
            width: '74px',
            height: '52px',
            left: `calc(12.5% + ${activeIndex * 25}% - 37px)`
          }}
        />

        {/* Icons */}
        <div className="relative flex items-center justify-between w-full h-full">
          {navigationItems.map((item, index) => {
            const IconComponent = item.icon;
            const isActive = activeIndex === index;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="relative flex flex-1 h-full items-center justify-center transition-transform active:scale-95 outline-none"
                aria-label={item.id}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <div 
                  className="transition-transform duration-300"
                  style={{
                    transform: isActive ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  <IconComponent
                    className={`transition-colors duration-500 ${
                      isActive 
                        ? 'text-[#050505] dark:text-white' 
                        : 'text-white dark:text-[#050505]'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    color="currentColor"
                    style={{
                      width: '26px',
                      height: '26px',
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
