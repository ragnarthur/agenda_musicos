import React from 'react';

type OwlMascotProps = {
  className?: string;
};

const OwlMascot: React.FC<OwlMascotProps> = ({ className }) => (
  <svg
    viewBox="0 0 64 64"
    className={`owl-mascot ${className ?? ''}`}
    aria-hidden="true"
    focusable="false"
  >
    <g className="owl-bob">
      <path className="owl-ear" d="M16 24 L24 10 L32 24 Z" />
      <path className="owl-ear" d="M32 24 L40 10 L48 24 Z" />
      <circle className="owl-body" cx="32" cy="32" r="18" />
      <circle className="owl-body-shine" cx="24" cy="26" r="9" />
      <circle className="owl-face" cx="32" cy="34" r="12" />

      <path className="owl-brow" d="M22 27 Q26 24 30 27" />
      <path className="owl-brow" d="M34 27 Q38 24 42 27" />

      <g className="owl-eye owl-eye-left">
        <circle className="owl-eye-white" cx="26" cy="32" r="4.2" />
        <circle className="owl-eye-pupil" cx="26" cy="32" r="2" />
        <circle className="owl-eye-highlight" cx="24.8" cy="30.8" r="0.8" />
      </g>
      <g className="owl-eye owl-eye-right">
        <circle className="owl-eye-white" cx="38" cy="32" r="4.2" />
        <circle className="owl-eye-pupil" cx="38" cy="32" r="2" />
        <circle className="owl-eye-highlight" cx="36.8" cy="30.8" r="0.8" />
      </g>

      <path className="owl-beak" d="M30 37 L34 37 L32 41 Z" />
      <path className="owl-tux" d="M25 46 L32 42 L39 46 L32 50 Z" />
      <path className="owl-tux-highlight" d="M29 44 L32 46.5 L35 44 L32 49 Z" />

      <g className="owl-baton">
        <rect className="owl-baton-stick" x="42" y="40" width="14" height="2" rx="1" />
        <circle className="owl-baton-tip" cx="57" cy="41" r="2" />
      </g>
    </g>
  </svg>
);

export default OwlMascot;
