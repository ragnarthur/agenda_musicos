import React from 'react';
import Lottie from 'lottie-react';
import owlAnimation from '../../assets/mascot/owl.json';

type OwlMascotProps = {
  className?: string;
};

const OwlMascot: React.FC<OwlMascotProps> = ({ className }) => (
  <Lottie
    animationData={owlAnimation}
    loop
    autoplay
    className={`owl-mascot ${className ?? ''}`}
    style={{ width: '100%', height: '100%' }}
    aria-hidden="true"
  />
);

export default OwlMascot;
