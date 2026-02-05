// hooks/useNetworkStatus.ts
// Hook para monitorar status de conexão com a internet
import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number | null;
  rtt: number | null;
}

interface NavigatorConnection {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
    downlink: number | null;
    rtt: number | null;
  }>({
    effectiveType: 'unknown',
    downlink: null,
    rtt: null,
  });

  const updateConnectionInfo = useCallback(() => {
    const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
    if (connection) {
      setConnectionInfo({
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink ?? null,
        rtt: connection.rtt ?? null,
      });
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Marca que estava offline para mostrar mensagem de reconexão
      if (!navigator.onLine) {
        setWasOffline(true);
        // Reset após 3 segundos
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API (se disponível)
    const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
    if (connection) {
      updateConnectionInfo();
      connection.addEventListener?.('change', updateConnectionInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      connection?.removeEventListener?.('change', updateConnectionInfo);
    };
  }, [updateConnectionInfo]);

  return {
    isOnline,
    wasOffline,
    ...connectionInfo,
  };
}
