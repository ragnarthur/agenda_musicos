import React from 'react';
import Lottie from 'lottie-react';
import owlAnimation from '../../assets/mascot/owl.json';
import useLowPowerMode from '../../hooks/useLowPowerMode';

type OwlMascotProps = {
  className?: string;
};

const OwlMascot: React.FC<OwlMascotProps> = ({ className }) => {
  const isLowPower = useLowPowerMode();
  const shouldAnimate = !isLowPower;
  const mascotClassName = `owl-mascot ${isLowPower ? 'owl-mascot--static' : ''} ${className ?? ''}`.trim();

  return (
    <Lottie
      animationData={owlAnimation}
      loop={shouldAnimate}
      autoplay={shouldAnimate}
      className={mascotClassName}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
};

export default OwlMascot;
