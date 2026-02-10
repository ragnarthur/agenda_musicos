import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { showToast } from '../../utils/toast';
import { haptics } from '../../hooks/useHaptics';

type UpdateSW = (reloadPage?: boolean) => Promise<void>;

// Checa atualizacao do SW em background (leve) para reduzir usuarios presos em versoes antigas.
const SW_UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1h

export default function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<UpdateSW | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        showToast.success('App pronto para uso offline.');
      },
      onRegisteredSW(_swUrl: string, registration?: ServiceWorkerRegistration) {
        if (!registration) return;
        window.setInterval(() => {
          registration.update().catch(() => undefined);
        }, SW_UPDATE_INTERVAL_MS);
      },
      onRegisterError(error: unknown) {
        // Sem barulho pro usuario; apenas log para debug.
        console.warn('[pwa] SW register error', error);
      },
    });

    setUpdateSW(() => update);
  }, []);

  const handleUpdate = async () => {
    if (!updateSW) return;
    haptics.medium();
    showToast.loading('Atualizando...');
    try {
      // true => recarrega a pagina apos ativar o novo SW
      await updateSW(true);
    } catch (err) {
      console.error('[pwa] update failed', err);
      showToast.error('Nao foi possivel atualizar agora.');
    }
  };

  const handleDismiss = () => {
    haptics.light();
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh ? (
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-4 right-4 z-[70] max-w-2xl mx-auto"
        >
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-indigo-500/15 flex items-center justify-center border border-white/10">
                <RefreshCw className="w-5 h-5 text-amber-200" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Atualizacao disponivel</p>
                <p className="mt-0.5 text-xs text-slate-300">
                  Toque em atualizar para aplicar as melhorias agora.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleUpdate}
                    className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors text-sm font-semibold min-h-[44px]"
                  >
                    Atualizar agora
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 rounded-lg bg-white/10 text-slate-200 hover:bg-white/15 transition-colors text-sm font-medium min-h-[44px]"
                  >
                    Depois
                  </button>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-3 -m-2 text-slate-300/70 hover:text-white transition-colors min-h-[44px] min-w-[44px]"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
