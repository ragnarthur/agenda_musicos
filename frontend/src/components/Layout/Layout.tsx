// components/Layout/Layout.tsx
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import TrialBanner from '../TrialBanner';

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

    elements.forEach((el) => {
      el.classList.remove('cascade-reveal');
      el.style.removeProperty('--cascade-index');
    });

    requestAnimationFrame(() => {
      let index = 0;
      elements.forEach((el) => {
        if (el.closest('[data-cascade-ignore]')) return;
        el.style.setProperty('--cascade-index', String(index));
        el.classList.add('cascade-reveal');
        index += 1;
      });
    });
  }, [location.pathname, location.search]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Blurs simplificados - apenas 2 sutis */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <div className="absolute top-20 -left-20 h-96 w-96 rounded-full bg-primary-500/20 blur-[100px]" />
        <div className="absolute bottom-20 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-[80px]" />
      </div>
      <TrialBanner />
      <Navbar />

      <div className="relative z-10 flex min-h-screen flex-col pt-6 sm:pt-8">
        <main ref={mainRef} className="container mx-auto flex-1 max-w-6xl px-3 sm:px-4 pb-16 lg:px-8">
          {children}
        </main>

        <footer className="border-t border-white/10 bg-white/5 px-4 py-6 text-center text-sm font-semibold text-slate-200 backdrop-blur">
          <p className="text-xs sm:text-sm text-slate-200">
            <span className="mr-1 text-base text-primary-700">®</span>
            DXM Tech. Todos os direitos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
