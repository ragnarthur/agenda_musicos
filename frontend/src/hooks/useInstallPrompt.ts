// hooks/useInstallPrompt.ts
// Hook para gerenciar instalação do PWA (Add to Home Screen)
import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isMobile: boolean;
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
  wasDismissed: boolean;
}

const DISMISS_KEY = 'gigflow_install_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const computeInstalled = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  };

  const [isInstalled, setIsInstalled] = useState(() => computeInstalled());
  const [wasDismissed, setWasDismissed] = useState(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;

    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    if (elapsed < DISMISS_DURATION) return true;

    localStorage.removeItem(DISMISS_KEY);
    return false;
  });

  // Detecta iOS (não suporta beforeinstallprompt)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);

  // Detecta se é dispositivo mobile (Android ou iOS)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Verifica se já está instalado (standalone mode)
  useEffect(() => {
    const checkInstalled = () => setIsInstalled(computeInstalled());

    // Escuta mudanças no display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    return () => mediaQuery.removeEventListener('change', checkInstalled);
  }, []);

  // Captura o evento beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detecta quando o app é instalado
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Dispara o prompt de instalação
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        return true;
      }
    } catch (error) {
      console.error('Erro ao mostrar prompt de instalação:', error);
    }

    setDeferredPrompt(null);
    return false;
  }, [deferredPrompt]);

  // Marca como dismissado
  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setWasDismissed(true);
  }, []);

  return {
    // Mostra botão se: não instalado, não dismissado, e (tem prompt OU é mobile)
    canInstall: !isInstalled && !wasDismissed && (!!deferredPrompt || isMobile),
    isInstalled,
    isIOS,
    isMobile,
    promptInstall,
    dismissPrompt,
    wasDismissed,
  };
}
