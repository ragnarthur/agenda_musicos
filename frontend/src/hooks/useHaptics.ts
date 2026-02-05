// hooks/useHaptics.ts
// Hook para feedback háptico (vibração) em dispositivos móveis
import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

// Padrões de vibração em millisegundos
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 30], // tap-pause-tap
  warning: [30, 30, 30], // three quick taps
  error: [50, 100, 50, 100, 50], // long pattern
  selection: 5,
};

interface HapticsHook {
  vibrate: (pattern?: HapticPattern | number | number[]) => void;
  isSupported: boolean;
}

export function useHaptics(): HapticsHook {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback(
    (pattern: HapticPattern | number | number[] = 'light') => {
      if (!isSupported) return;

      try {
        // Se for uma string, busca o padrão predefinido
        const vibrationPattern =
          typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;

        navigator.vibrate(vibrationPattern);
      } catch (error) {
        // Silently fail - vibração pode estar bloqueada pelo SO
        console.debug('Haptic feedback não disponível:', error);
      }
    },
    [isSupported]
  );

  return {
    vibrate,
    isSupported,
  };
}

// Utilitários para uso direto
export const haptics = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(25),
  heavy: () => navigator.vibrate?.(50),
  success: () => navigator.vibrate?.([10, 50, 30]),
  warning: () => navigator.vibrate?.([30, 30, 30]),
  error: () => navigator.vibrate?.([50, 100, 50, 100, 50]),
  selection: () => navigator.vibrate?.(5),
};
