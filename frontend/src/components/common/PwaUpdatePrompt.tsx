import { useCallback, useEffect, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { showToast } from '../../utils/toast';
import { trackEvent } from '../../utils/analytics';

// Checa atualizacao do SW em background para reduzir usuarios presos em versoes antigas.
const SW_UPDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const SW_UPDATE_MIN_GAP_MS = 2 * 60 * 1000; // evita checagens repetidas em foco/visibilidade

export default function PwaUpdatePrompt() {
  const registeredRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const lastUpdateCheckRef = useRef(0);

  const checkForUpdates = useCallback(() => {
    const registration = registrationRef.current;
    if (!registration) return;

    const now = Date.now();
    if (now - lastUpdateCheckRef.current < SW_UPDATE_MIN_GAP_MS) return;
    lastUpdateCheckRef.current = now;

    registration.update().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    registerSW({
      immediate: true,
      onNeedRefresh() {
        // Com autoUpdate, o SW ativa sozinho e recarrega a pagina em seguida.
        showToast.loading('Atualizando para nova versao...');
        trackEvent('pwa_auto_update_applied');
      },
      onOfflineReady() {
        showToast.success('App pronto para uso offline.');
        trackEvent('pwa_offline_ready');
      },
      onRegisteredSW(_swUrl: string, registration?: ServiceWorkerRegistration) {
        if (!registration) return;
        registrationRef.current = registration;
        checkForUpdates();
      },
      onRegisterError(error: unknown) {
        console.warn('[pwa] SW register error', error);
      },
    });

    const intervalId = window.setInterval(checkForUpdates, SW_UPDATE_INTERVAL_MS);
    const handleFocus = () => checkForUpdates();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  return null;
}
