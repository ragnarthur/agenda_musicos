// components/Layout/Layout.tsx
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import AnimatedBackground from './AnimatedBackground';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

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
    <div className="relative min-h-[100svh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Aqui eu deixo o fundo estático pra economizar GPU no mobile, mas sem perder identidade */}
      {/* As partículas ficam só nas telas-chave (login/landing/cadastro). */}
      <AnimatedBackground enableBlueWaves enableParticles={false} />
      <Navbar />

      <div className="relative z-10 flex min-h-[100svh] flex-col pt-4 sm:pt-6">
        <main
          ref={mainRef}
          className="page-shell flex-1 pb-24 md:pb-16"
        >
          {children}
        </main>

        <footer className="hidden md:block border-t border-white/10 bg-white/5 px-4 py-6 text-center text-sm font-semibold text-slate-200 backdrop-blur">
          <p className="text-xs sm:text-sm text-slate-200">
            <span className="mr-1 text-base text-primary-700">®</span>
            DXM Tech. Todos os direitos reservados.
          </p>
        </footer>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
    </div>
  );
};

export default Layout;
