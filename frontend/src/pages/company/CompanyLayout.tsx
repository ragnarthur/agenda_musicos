// pages/company/CompanyLayout.tsx
// Layout wrapper para páginas de empresas
import React from 'react';
import CompanyNavbar from '../../components/navigation/CompanyNavbar';

interface CompanyLayoutProps {
  children: React.ReactNode;
}

const CompanyLayout: React.FC<CompanyLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavbar />
      {children}
    </div>
  );
};

export default CompanyLayout;