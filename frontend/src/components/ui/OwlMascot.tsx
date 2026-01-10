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
    aria-hidden="true"
  />
);

export default OwlMascot;
