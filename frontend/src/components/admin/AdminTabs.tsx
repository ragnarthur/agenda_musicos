import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface AdminTab {
  key: string;
  label: string;
  icon?: LucideIcon;
}

interface AdminTabsProps {
  tabs: AdminTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export const AdminTabs: React.FC<AdminTabsProps> = ({ tabs, active, onChange, className = '' }) => {
  return (
    <div className={`admin-tabs ${className}`}>
      {tabs.map(tab => {
        const isActive = active === tab.key;
        const Icon = tab.icon;

        return (
          <motion.button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`admin-tab ${isActive ? 'admin-tab-active' : 'admin-tab-inactive'}`}
            whileHover={isActive ? undefined : { scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
          >
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4" />}
              {tab.label}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};
