import React, { memo, useMemo } from 'react';
import Lottie from 'lottie-react';
import owlAnimation from '../../assets/mascot/owl.json';
import useLowPowerMode from '../../hooks/useLowPowerMode';

type OwlMascotProps = {
  className?: string;
};

const OwlMascot: React.FC<OwlMascotProps> = memo(({ className }) => {
  const isLowPower = useLowPowerMode();
  const shouldAnimate = !isLowPower;

  // Memoizar o className para evitar recálculo
  const mascotClassName = useMemo(() => {
    return `owl-mascot ${isLowPower ? 'owl-mascot--static' : ''} ${className ?? ''}`.trim();
  }, [isLowPower, className]);

  // Memoizar o estilo para evitar re-render do Lottie
  const lottieStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

  return (
    <Lottie
      animationData={owlAnimation}
      loop={shouldAnimate}
      autoplay={shouldAnimate}
      className={mascotClassName}
      style={lottieStyle}
      aria-hidden="true"
    />
  );
});
OwlMascot.displayName = 'OwlMascot';

export default OwlMascot;
