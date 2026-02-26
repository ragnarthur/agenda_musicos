// components/Layout/Layout.tsx
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import AppVersionMessage from '../common/AppVersionMessage';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // SPA navigation preserves scroll by default; force top for a consistent UX.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;

    const selector = 'h1,h2,h3,h4,h5,h6,p,li,label,small,button';
    const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;

    elements.forEach(el => {
      el.classList.remove('cascade-reveal');
      el.style.removeProperty('--cascade-index');
    });

    requestAnimationFrame(() => {
      let index = 0;
      // No mobile eu limito o cascade pra manter o efeito sem pesar no scroll.
      const maxAnimated = isSmallScreen ? 15 : elements.length;
      elements.forEach(el => {
        if (el.closest('[data-cascade-ignore]')) return;
        if (index >= maxAnimated) return;
        el.style.setProperty('--cascade-index', String(index));
        el.classList.add('cascade-reveal');
        index += 1;
      });
    });
  }, [location.pathname, location.search]);

  return (
    <div className="relative min-h-[100svh]">
      {/* Musician background: warm stage lighting (key / fill / back) */}
      <div className="musician-bg" aria-hidden="true">
        <div className="musician-light-key" />
        <div className="musician-light-fill" />
        <div className="musician-light-back" />
      </div>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>
      <Navbar />

      <div className="relative z-10 flex min-h-[100svh] flex-col pt-4 sm:pt-6">
        <main id="main-content" ref={mainRef} className="page-shell flex-1 pb-24 md:pb-16">
          {children}
        </main>

        <footer className="border-t border-slate-200/70 bg-white/72 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+5.25rem)] text-center text-[11px] font-medium text-slate-600 backdrop-blur dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-300 md:px-4 md:py-6 md:text-sm md:font-semibold">
          <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 dark:text-slate-300">
            <span className="mr-1 text-base text-primary-600 dark:text-primary-400">®</span>
            DXM Tech. Todos os direitos reservados.
          </p>
          <AppVersionMessage className="mt-1 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400" />
        </footer>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
};

export default Layout;
