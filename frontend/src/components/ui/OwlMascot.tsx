import React, { memo, useMemo } from 'react';
import Lottie from 'lottie-react';
import animationData from '../../assets/mascot/owl.json';

type OwlMascotProps = {
  className?: string;
};

const OwlMascot: React.FC<OwlMascotProps> = memo(({ className }) => {
  // Memoizar o className para evitar recálculo
  const mascotClassName = useMemo(() => {
    return `owl-mascot ${className ?? ''}`.trim();
  }, [className]);

  // Memoizar o estilo para evitar re-render do Lottie
  const lottieStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

  return (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      className={mascotClassName}
      style={lottieStyle}
      aria-hidden="true"
    />
  );
});
OwlMascot.displayName = 'OwlMascot';

export default OwlMascot;
