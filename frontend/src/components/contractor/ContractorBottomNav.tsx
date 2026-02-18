import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { contractorNavItems } from '../../routes/contractorRoutes';

const ContractorBottomNav: React.FC = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide on login/register pages
  if (location.pathname === '/contratante/login' || location.pathname === '/contratante/cadastro') {
    return null;
  }

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200/70 dark:border-white/10 pb-safe-only transition-transform duration-300 shadow-lg shadow-slate-200/60 dark:shadow-black/30 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {contractorNavItems.map(item => {
          const Icon = item.icon;
          const isAction = 'isAction' in item && item.isAction;
          const isActive =
            item.path === '/contratante/dashboard'
              ? location.pathname === '/contratante/dashboard'
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

          if (isAction) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className="flex flex-col items-center justify-center -mt-4 min-h-[44px]"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-2 ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${isActive ? 'scale-110' : ''} transition-transform`}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-600 dark:bg-primary-400" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default ContractorBottomNav;
