// components/common/OfflineBanner.tsx
// Toast compacto para status de conexão
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  return (
    <AnimatePresence mode="wait">
      {!isOnline && (
        <motion.div
          key="offline"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="fixed top-[calc(env(safe-area-inset-top)+12px)] right-3 sm:right-4 z-[100]"
        >
          <div className="flex items-center gap-2 bg-amber-500 text-amber-950 rounded-full px-3.5 py-2 shadow-lg shadow-amber-500/30 text-sm font-medium">
            <motion.div
              animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <WifiOff className="w-4 h-4 flex-shrink-0" />
            </motion.div>
            <span>Offline</span>
          </div>
        </motion.div>
      )}

      {isOnline && wasOffline && (
        <motion.div
          key="online"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="fixed top-[calc(env(safe-area-inset-top)+12px)] right-3 sm:right-4 z-[100]"
        >
          <div className="flex items-center gap-2 bg-emerald-500 text-white rounded-full px-3.5 py-2 shadow-lg shadow-emerald-500/30 text-sm font-medium">
            <Wifi className="w-4 h-4 flex-shrink-0" />
            <span>Conectado</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
