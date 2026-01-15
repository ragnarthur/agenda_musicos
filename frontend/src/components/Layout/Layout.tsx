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
  const blobPrimaryRef = useRef<HTMLDivElement | null>(null);
  const blobSecondaryRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const blobPrimary = blobPrimaryRef.current;
    const blobSecondary = blobSecondaryRef.current;

    if (!blobPrimary || !blobSecondary) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let rafId: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const update = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      const offsetX = currentX * 14;
      const offsetY = currentY * 12;

      blobPrimary.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
      blobSecondary.style.transform = `translate3d(${-offsetX}px, ${-offsetY}px, 0)`;

      if (Math.abs(currentX - targetX) > 0.001 || Math.abs(currentY - targetY) > 0.001) {
        rafId = requestAnimationFrame(update);
      } else {
        rafId = null;
      }
    };

    const onMove = (event: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetX = (event.clientX / innerWidth) * 2 - 1;
      targetY = (event.clientY / innerHeight) * 2 - 1;

      if (rafId === null) {
        rafId = requestAnimationFrame(update);
      }
    };

    window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <svg
          className="fabric-wave"
          viewBox="0 0 1200 1200"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="fabricGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b1220" />
              <stop offset="45%" stopColor="#0f1b2d" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            <filter id="fabricDisplace" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.03"
                numOctaves="2"
                seed="2"
                result="noise"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="18s"
                  values="0.012 0.03;0.02 0.04;0.012 0.03"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="24" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          <rect width="1200" height="1200" fill="url(#fabricGradient)" filter="url(#fabricDisplace)" />
        </svg>
        <div className="dust-layer dust-layer--primary" />
        <div className="dust-layer dust-layer--secondary" />

        <div
          ref={blobPrimaryRef}
          className="parallax-blob absolute top-20 -left-20 h-96 w-96 rounded-full bg-primary-500/20 blur-[100px]"
        />
        <div
          ref={blobSecondaryRef}
          className="parallax-blob absolute bottom-20 right-0 h-80 w-80 rounded-full bg-indigo-500/15 blur-[80px]"
        />
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
