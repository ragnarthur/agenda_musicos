import { useEffect, useState } from 'react';

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
  deviceMemory?: number;
};

const useLowPowerMode = () => {
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dataQuery = window.matchMedia('(prefers-reduced-data: reduce)');

    const evaluate = () => {
      const navigatorWithConnection = navigator as NavigatorWithConnection;
      const saveData = navigatorWithConnection.connection?.saveData ?? false;
      const deviceMemory = navigatorWithConnection.deviceMemory;
      const hardwareConcurrency = navigator.hardwareConcurrency;
      const lowMemory = typeof deviceMemory === 'number' && deviceMemory <= 2;
      const lowCores =
        typeof hardwareConcurrency === 'number' &&
        hardwareConcurrency > 0 &&
        hardwareConcurrency <= 2;

      // Eu tirei o tamanho da tela desse cálculo pra não matar efeitos no mobile.
      // A performance do mobile agora é ajustada onde o efeito acontece.
      setLowPower(motionQuery.matches || dataQuery.matches || saveData || lowMemory || lowCores);
    };

    const onChange = () => evaluate();
    const addListener = (query: MediaQueryList) => {
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', onChange);
        return;
      }
      const legacyQuery = query as MediaQueryList & {
        addListener: (listener: (event: MediaQueryListEvent) => void) => void;
      };
      legacyQuery.addListener(onChange);
    };
    const removeListener = (query: MediaQueryList) => {
      if (typeof query.removeEventListener === 'function') {
        query.removeEventListener('change', onChange);
        return;
      }
      const legacyQuery = query as MediaQueryList & {
        removeListener: (listener: (event: MediaQueryListEvent) => void) => void;
      };
      legacyQuery.removeListener(onChange);
    };

    evaluate();
    addListener(motionQuery);
    addListener(dataQuery);

    return () => {
      removeListener(motionQuery);
      removeListener(dataQuery);
    };
  }, []);

  return lowPower;
};

export default useLowPowerMode;
