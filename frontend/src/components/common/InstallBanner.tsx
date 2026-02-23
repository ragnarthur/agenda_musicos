// components/common/InstallBanner.tsx
// Banner para incentivar instalação do PWA
import { useState, useEffect, useRef } from 'react';
import { X, Download, Share, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { haptics } from '../../hooks/useHaptics';
import { trackEvent } from '../../utils/analytics';

const VISIT_COUNT_KEY = 'gigflow_visit_count';
const MIN_VISITS_TO_SHOW = 2;

export default function InstallBanner() {
  const { canInstall, isIOS, promptInstall, dismissPrompt } = useInstallPrompt();
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const hasTrackedBannerViewRef = useRef(false);

  // Só mostra após algumas visitas
  useEffect(() => {
    const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    localStorage.setItem(VISIT_COUNT_KEY, (count + 1).toString());

    if (count >= MIN_VISITS_TO_SHOW && canInstall) {
      // Delay para não atrapalhar a experiência inicial
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  useEffect(() => {
    if (isVisible && !hasTrackedBannerViewRef.current) {
      hasTrackedBannerViewRef.current = true;
      trackEvent('pwa_install_banner_shown', { ios: isIOS });
    }
  }, [isVisible, isIOS]);

  const handleInstall = async () => {
    haptics.medium();
    trackEvent('pwa_install_click', { ios: isIOS });

    if (isIOS) {
      setShowIOSInstructions(true);
      trackEvent('pwa_install_ios_instructions_opened');
    } else {
      const success = await promptInstall();
      if (success) {
        haptics.success();
        setIsVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    haptics.light();
    trackEvent('pwa_install_banner_dismissed');
    dismissPrompt();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 p-4 border border-indigo-500/30">
              <div className="flex items-start gap-3">
                {/* App icon */}
                <div className="flex-shrink-0 w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-white text-sm leading-snug">
                    Sua agenda, sempre no bolso
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                    Acesse compromissos e músicos sem internet.
                  </p>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleInstall}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 active:scale-95 transition-all min-h-[44px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isIOS ? 'Como instalar' : 'Instalar'}
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2 bg-white/8 text-slate-400 rounded-xl text-sm hover:bg-white/12 hover:text-white active:scale-95 transition-all min-h-[44px]"
                    >
                      Depois
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-2 -mt-1 -mr-1 text-slate-500 hover:text-slate-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de instruções para iOS */}
      <AnimatePresence>
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setShowIOSInstructions(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-slate-900 border border-white/10 rounded-t-3xl w-full max-w-md p-6 pb-safe"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-6" />

              <h3 className="font-heading text-lg font-bold text-white mb-1 text-center">
                Instalar no iPhone / iPad
              </h3>
              <p className="text-slate-400 text-xs text-center mb-5">
                Adicione à tela inicial em 3 passos
              </p>

              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center text-xs font-semibold border border-indigo-500/30">
                    1
                  </span>
                  <p className="text-slate-300 text-sm pt-0.5">
                    Toque no botão <Share className="inline w-4 h-4 text-blue-400" /> de
                    compartilhar na barra do Safari
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center text-xs font-semibold border border-indigo-500/30">
                    2
                  </span>
                  <p className="text-slate-300 text-sm pt-0.5">
                    Role para baixo e toque em{' '}
                    <strong className="text-white">"Adicionar à Tela de Início"</strong>
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center text-xs font-semibold border border-indigo-500/30">
                    3
                  </span>
                  <p className="text-slate-300 text-sm pt-0.5">
                    Toque em <strong className="text-white">"Adicionar"</strong> no canto superior
                    direito
                  </p>
                </li>
              </ol>

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full mt-6 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 active:scale-98 transition-all min-h-[48px]"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
