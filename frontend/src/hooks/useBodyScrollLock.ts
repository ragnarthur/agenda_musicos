import { useEffect } from 'react';

/**
 * Bloqueia scroll do body quando modal está aberto
 * Previne rubber-band scrolling no iOS
 */
export const useBodyScrollLock = (isLocked: boolean): void => {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollY = window.scrollY;

    // Calcular largura da scrollbar para evitar layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Bloquear scroll
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    // iOS: prevenir rubber-band scrolling
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    const preventTouchMove = (e: TouchEvent) => {
      if (e.target === document.body) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, [isLocked]);
};
