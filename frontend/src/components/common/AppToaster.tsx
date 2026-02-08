import React, { memo, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../../contexts/useTheme';

const AppToaster: React.FC = memo(() => {
  const { theme } = useTheme();

  const toastStyle = useMemo<React.CSSProperties>(() => {
    if (theme === 'dark') {
      return {
        background: '#0b1220',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        boxShadow: '0 18px 50px rgba(0, 0, 0, 0.45)',
      };
    }
    return {
      background: '#ffffff',
      color: '#0f172a',
      border: '1px solid rgba(15, 23, 42, 0.10)',
      boxShadow: '0 18px 50px rgba(15, 23, 42, 0.16)',
    };
  }, [theme]);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: toastStyle,
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
          duration: 5000,
        },
      }}
    />
  );
});

AppToaster.displayName = 'AppToaster';

export default AppToaster;

