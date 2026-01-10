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
    <defs>
      <linearGradient id="owl-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#9a6b3b" />
        <stop offset="100%" stopColor="#5c3b23" />
      </linearGradient>
      <linearGradient id="owl-wing" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7a4f2a" />
        <stop offset="100%" stopColor="#4a2d1a" />
      </linearGradient>
      <linearGradient id="owl-face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f8ead7" />
        <stop offset="100%" stopColor="#e6c9a5" />
      </linearGradient>
      <radialGradient id="owl-iris" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="70%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
    </defs>
    <g className="owl-bob">
      <path d="M14 24 L22 8 L30 24 Z" fill="url(#owl-body)" />
      <path d="M34 24 L42 8 L50 24 Z" fill="url(#owl-body)" />
      <circle cx="32" cy="26" r="14" fill="url(#owl-body)" />
      <ellipse cx="32" cy="38" rx="18" ry="20" fill="url(#owl-body)" />
      <path d="M10 36 Q16 22 26 30 Q22 44 12 46 Z" fill="url(#owl-wing)" />
      <path d="M54 36 Q48 22 38 30 Q42 44 52 46 Z" fill="url(#owl-wing)" />
      <ellipse cx="32" cy="40" rx="12" ry="14" fill="url(#owl-face)" />
      <ellipse cx="24" cy="28" rx="8" ry="9" fill="url(#owl-face)" />
      <ellipse cx="40" cy="28" rx="8" ry="9" fill="url(#owl-face)" />

      <g className="owl-eye owl-eye-left">
        <circle cx="24" cy="28" r="4.6" fill="#ffffff" />
        <circle cx="24" cy="28" r="3.2" fill="url(#owl-iris)" />
        <circle cx="24" cy="28" r="1.4" fill="#0f172a" />
        <circle cx="22.6" cy="26.6" r="0.8" fill="#f8fafc" />
      </g>
      <g className="owl-eye owl-eye-right">
        <circle cx="40" cy="28" r="4.6" fill="#ffffff" />
        <circle cx="40" cy="28" r="3.2" fill="url(#owl-iris)" />
        <circle cx="40" cy="28" r="1.4" fill="#0f172a" />
        <circle cx="38.6" cy="26.6" r="0.8" fill="#f8fafc" />
      </g>

      <path d="M30 31 L34 31 L32 35 Z" fill="#d97706" />
      <path d="M26 44 Q32 42 38 44" stroke="#c7a680" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M26 48 Q32 46 38 48" stroke="#c7a680" strokeWidth="1.1" fill="none" opacity="0.6" />

      <g className="owl-baton">
        <rect x="42" y="40" width="14" height="2" rx="1" fill="#f8fafc" />
        <circle cx="57" cy="41" r="2" fill="#fde68a" />
      </g>
    </g>
  </svg>
);

export default OwlMascot;
