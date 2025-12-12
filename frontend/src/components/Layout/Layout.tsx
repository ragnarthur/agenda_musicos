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
      <main className="relative z-10 container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24">
        {children}
      </main>
    </div>
  );
};

export default Layout;
