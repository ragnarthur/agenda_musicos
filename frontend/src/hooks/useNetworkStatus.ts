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

  type ConnectionInfo = Pick<NetworkStatus, 'effectiveType' | 'downlink' | 'rtt'>;

  const readConnectionInfo = useCallback((): ConnectionInfo => {
    const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
    return {
      effectiveType: (connection?.effectiveType ?? 'unknown') as ConnectionInfo['effectiveType'],
      downlink: connection?.downlink ?? null,
      rtt: connection?.rtt ?? null,
    };
  }, []);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>(() => readConnectionInfo());

  const updateConnectionInfo = useCallback(() => {
    setConnectionInfo(readConnectionInfo());
  }, [readConnectionInfo]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // wasOffline já foi setado pelo handleOffline
      // Reset após 3 segundos para esconder a mensagem de reconexão
      setTimeout(() => setWasOffline(false), 3000);
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
