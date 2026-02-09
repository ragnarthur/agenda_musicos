// hooks/usePullToRefresh.ts
// Hook para implementar gesto de pull-to-refresh
import { useState, useCallback, useRef, useEffect } from 'react';
import { haptics } from './useHaptics';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // pixels para ativar refresh
  maxPull?: number; // máximo de pixels que pode puxar
  disabled?: boolean;
}

interface PullToRefreshState {
  isRefreshing: boolean;
  pullProgress: number; // 0-1
  isPulling: boolean;
}

interface PullToRefreshHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function usePullToRefresh(options: PullToRefreshOptions): PullToRefreshState & PullToRefreshHandlers {
  const { onRefresh, threshold = 80, maxPull = 120, disabled = false } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef(false);
  const hapticFired = useRef(false);

  // Verifica se está no topo da página
  const isAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || !isAtTop()) return;

      startY.current = e.touches[0].clientY;
      isDragging.current = true;
      hapticFired.current = false;
    },
    [disabled, isRefreshing, isAtTop]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current || disabled || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      // Só ativa se estiver puxando para baixo
      if (diff > 0 && isAtTop()) {
        setIsPulling(true);
        // Aplica resistência no pull (efeito elástico)
        const resistance = 0.5;
        const pull = Math.min(diff * resistance, maxPull);
        setPullDistance(pull);

        // Haptic feedback when threshold is reached
        if (pull >= threshold && !hapticFired.current) {
          hapticFired.current = true;
          haptics.medium();
        }

        // Previne scroll nativo durante o pull
        if (pull > 10) {
          e.preventDefault();
        }
      }
    },
    [disabled, isRefreshing, isAtTop, maxPull]
  );

  const onTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Mantém na posição de refresh

      try {
        await onRefresh();
        haptics.success();
      } catch {
        haptics.error();
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reseta o pull
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  // Cleanup quando componente desmonta
  useEffect(() => {
    return () => {
      isDragging.current = false;
    };
  }, []);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return {
    isRefreshing,
    pullProgress,
    isPulling,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
