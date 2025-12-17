// components/Layout/Layout.tsx
import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <div className="animated-bg pointer-events-none" />
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-20 -left-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute top-10 right-[-120px] h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/3 h-96 w-96 rounded-full bg-emerald-200/40 blur-[120px]" />
      </div>
      <Navbar />

      <div className="relative z-10 flex min-h-screen flex-col pt-6 sm:pt-8">
        {/* pb-24 para acomodar navbar mobile fixa (64px + safe-area) */}
        <main className="container mx-auto flex-1 max-w-6xl px-3 sm:px-4 pb-28 md:pb-16 lg:px-8">
          {children}
        </main>

        <footer className="hidden md:block border-t border-white/20 bg-white/5 px-4 py-6 text-center text-sm font-semibold text-slate-700 backdrop-blur">
          <p className="text-xs sm:text-sm text-slate-800">
            <span className="mr-1 text-base text-primary-700">®</span>
            DXM Tech - Arthur Araújo. Todos os direitos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
