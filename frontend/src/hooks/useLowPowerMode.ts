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
    const smallQuery = window.matchMedia('(max-width: 768px)');

    const evaluate = () => {
      const navigatorWithConnection = navigator as NavigatorWithConnection;
      const saveData = navigatorWithConnection.connection?.saveData ?? false;
      const deviceMemory = navigatorWithConnection.deviceMemory;
      const hardwareConcurrency = navigator.hardwareConcurrency;
      const lowMemory = typeof deviceMemory === 'number' && deviceMemory <= 2;
      const lowCores = typeof hardwareConcurrency === 'number' && hardwareConcurrency > 0 && hardwareConcurrency <= 2;

      setLowPower(
        motionQuery.matches ||
          dataQuery.matches ||
          smallQuery.matches ||
          saveData ||
          lowMemory ||
          lowCores
      );
    };

    const onChange = () => evaluate();
    const addListener = (query: MediaQueryList) => {
      if ('addEventListener' in query) {
        query.addEventListener('change', onChange);
      } else {
        query.addListener(onChange);
      }
    };
    const removeListener = (query: MediaQueryList) => {
      if ('removeEventListener' in query) {
        query.removeEventListener('change', onChange);
      } else {
        query.removeListener(onChange);
      }
    };

    evaluate();
    addListener(motionQuery);
    addListener(dataQuery);
    addListener(smallQuery);

    return () => {
      removeListener(motionQuery);
      removeListener(dataQuery);
      removeListener(smallQuery);
    };
  }, []);

  return lowPower;
};

export default useLowPowerMode;
