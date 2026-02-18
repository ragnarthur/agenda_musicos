// components/common/InstallBanner.tsx
// Banner para incentivar instalação do PWA
import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { haptics } from '../../hooks/useHaptics';

const VISIT_COUNT_KEY = 'gigflow_visit_count';
const MIN_VISITS_TO_SHOW = 2;

export default function InstallBanner() {
  const { canInstall, isIOS, promptInstall, dismissPrompt } = useInstallPrompt();
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

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

  const handleInstall = async () => {
    haptics.medium();

    if (isIOS) {
      setShowIOSInstructions(true);
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
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-4 border border-white/10">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm">Instalar GigFlow</h3>
                  <p className="text-white/80 text-xs mt-0.5 leading-relaxed">
                    Adicione à tela inicial para acesso rápido e experiência de app nativo.
                  </p>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleInstall}
                      className="flex-1 px-3 py-2 bg-white text-indigo-600 rounded-lg text-sm font-medium hover:bg-white/90 active:scale-95 transition-all min-h-[44px]"
                    >
                      {isIOS ? 'Como instalar' : 'Instalar'}
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 active:scale-95 transition-all min-h-[44px]"
                    >
                      Depois
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-3 -m-2 text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px]"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
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
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setShowIOSInstructions(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-md p-6 pb-safe"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6" />

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
                Instalar no iPhone/iPad
              </h3>

              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Toque no botão <Share className="inline w-4 h-4 text-blue-500" /> de
                      compartilhar na barra do Safari
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      Toque em <strong>"Adicionar"</strong> no canto superior direito
                    </p>
                  </div>
                </li>
              </ol>

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full mt-6 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 active:scale-98 transition-all min-h-[48px]"
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
