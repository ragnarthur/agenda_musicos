// components/Layout/Layout.tsx
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import AnimatedBackground from './AnimatedBackground';
import InstallBanner from '../common/InstallBanner';
import OfflineBanner from '../common/OfflineBanner';
import PwaUpdatePrompt from '../common/PwaUpdatePrompt';
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
    <div className="relative min-h-[100svh] bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Banners globais */}
      <OfflineBanner />
      <PwaUpdatePrompt />
      <InstallBanner />

      {/* Aqui eu deixo o fundo estático pra economizar GPU no mobile, mas sem perder identidade */}
      {/* As partículas ficam só nas telas-chave (login/landing/cadastro). */}
      <AnimatedBackground enableBlueWaves enableParticles={false} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>
      <Navbar />

      <div className="relative z-10 flex min-h-[100svh] flex-col pt-4 sm:pt-6">
        <main
          id="main-content"
          ref={mainRef}
          className="page-shell flex-1 pb-24 md:pb-16"
        >
          {children}
        </main>

        <footer className="hidden md:block border-t border-slate-200/70 bg-white/70 px-4 py-6 text-center text-sm font-semibold text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200">
            <span className="mr-1 text-base text-primary-600 dark:text-primary-400">®</span>
            DXM Tech. Todos os direitos reservados.
          </p>
          <AppVersionMessage className="mt-1 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-300/90" />
        </footer>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
};

export default Layout;
