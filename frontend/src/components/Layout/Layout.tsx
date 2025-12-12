// components/Layout/Layout.tsx
import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</main>
    </div>
  );
};

export default Layout;
