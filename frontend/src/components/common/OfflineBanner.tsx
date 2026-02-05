// components/common/OfflineBanner.tsx
// Banner que aparece quando o usuário está offline
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
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 pt-safe"
        >
          <div className="flex items-center justify-center gap-2 text-sm font-medium max-w-md mx-auto">
            <WifiOff className="w-4 h-4" />
            <span>Você está offline</span>
          </div>
        </motion.div>
      )}

      {isOnline && wasOffline && (
        <motion.div
          key="online"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-emerald-500 text-white px-4 py-2 pt-safe"
        >
          <div className="flex items-center justify-center gap-2 text-sm font-medium max-w-md mx-auto">
            <Wifi className="w-4 h-4" />
            <span>Conexão restaurada</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
