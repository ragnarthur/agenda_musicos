// components/ui/CardBrandRow.tsx
import React from 'react';

const logoClassName = 'h-4 w-auto max-w-[28px]';
const badgeClassName =
  'inline-flex h-7 w-10 items-center justify-center rounded-md border border-slate-200/70 bg-white/90 shadow-sm';

const VisaLogo = () => (
  <svg viewBox="0 0 64 24" className={logoClassName} aria-hidden="true">
    <rect width="64" height="24" rx="4" fill="#1A1F71" />
    <rect y="20" width="64" height="4" fill="#F7B600" />
    <text
      x="32"
      y="16"
      textAnchor="middle"
      fontSize="12"
      fontWeight="700"
      fill="#FFFFFF"
      fontFamily="Arial, sans-serif"
    >
      VISA
    </text>
  </svg>
);

const MastercardLogo = () => (
  <svg viewBox="0 0 64 24" className={logoClassName} aria-hidden="true">
    <rect width="64" height="24" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
    <circle cx="28" cy="12" r="7" fill="#EB001B" />
    <circle cx="36" cy="12" r="7" fill="#F79E1B" />
    <circle cx="32" cy="12" r="7" fill="#F04E23" opacity="0.9" />
    <text
      x="32"
      y="21"
      textAnchor="middle"
      fontSize="6"
      fontWeight="600"
      fill="#111827"
      fontFamily="Arial, sans-serif"
      letterSpacing="0.5"
    >
      MASTERCARD
    </text>
  </svg>
);

const EloLogo = () => (
  <svg viewBox="0 0 64 24" className={logoClassName} aria-hidden="true">
    <rect width="64" height="24" rx="4" fill="#0B0B0B" />
    <circle cx="16" cy="12" r="6.5" fill="#F9B233" opacity="0.85" />
    <circle cx="20" cy="12" r="6.5" fill="#E31E24" opacity="0.85" />
    <circle cx="24" cy="12" r="6.5" fill="#0097D8" opacity="0.85" />
    <text
      x="40"
      y="16"
      textAnchor="middle"
      fontSize="12"
      fontWeight="700"
      fill="#FFFFFF"
      fontFamily="Arial, sans-serif"
    >
      elo
    </text>
  </svg>
);

const AmexLogo = () => (
  <svg viewBox="0 0 64 24" className={logoClassName} aria-hidden="true">
    <rect width="64" height="24" rx="4" fill="#0077C8" />
    <text
      x="32"
      y="16"
      textAnchor="middle"
      fontSize="11"
      fontWeight="700"
      fill="#FFFFFF"
      fontFamily="Arial, sans-serif"
      letterSpacing="0.5"
    >
      AMEX
    </text>
  </svg>
);

const HipercardLogo = () => (
  <svg viewBox="0 0 64 24" className={logoClassName} aria-hidden="true">
    <rect width="64" height="24" rx="4" fill="#B11B1B" />
    <text
      x="32"
      y="16"
      textAnchor="middle"
      fontSize="9"
      fontWeight="700"
      fill="#FFFFFF"
      fontFamily="Arial, sans-serif"
      letterSpacing="0.4"
    >
      HIPERCARD
    </text>
  </svg>
);

const DinersLogo = () => (
  <svg viewBox="0 0 64 24" className={logoClassName} aria-hidden="true">
    <rect width="64" height="24" rx="4" fill="#1B365D" />
    <circle cx="24" cy="12" r="7" fill="#FFFFFF" opacity="0.2" />
    <circle cx="40" cy="12" r="7" fill="#FFFFFF" opacity="0.2" />
    <text
      x="32"
      y="16"
      textAnchor="middle"
      fontSize="10"
      fontWeight="700"
      fill="#FFFFFF"
      fontFamily="Arial, sans-serif"
    >
      DINERS
    </text>
  </svg>
);

const DiscoverLogo = () => (
  <svg viewBox="0 0 64 24" className={logoClassName} aria-hidden="true">
    <rect width="64" height="24" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
    <path d="M18 16c6-6 22-6 28 0" stroke="#F76B1C" strokeWidth="3" fill="none" />
    <text
      x="32"
      y="14"
      textAnchor="middle"
      fontSize="9"
      fontWeight="700"
      fill="#111827"
      fontFamily="Arial, sans-serif"
      letterSpacing="0.5"
    >
      DISCOVER
    </text>
  </svg>
);

const MaestroLogo = () => (
  <svg viewBox="0 0 64 24" className={logoClassName} aria-hidden="true">
    <rect width="64" height="24" rx="4" fill="#F5F5F5" stroke="#E2E8F0" />
    <circle cx="28" cy="12" r="6.5" fill="#1C4AA2" />
    <circle cx="36" cy="12" r="6.5" fill="#EB001B" />
    <text
      x="32"
      y="20"
      textAnchor="middle"
      fontSize="7"
      fontWeight="700"
      fill="#374151"
      fontFamily="Arial, sans-serif"
      letterSpacing="0.6"
    >
      MAESTRO
    </text>
  </svg>
);

type CardBrandRowProps = {
  className?: string;
};

const CardBrandRow: React.FC<CardBrandRowProps> = ({ className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`.trim()}>
      <span
        role="img"
        aria-label="Visa"
        title="Visa"
        className={badgeClassName}
      >
        <VisaLogo />
      </span>
      <span
        role="img"
        aria-label="Mastercard"
        title="Mastercard"
        className={badgeClassName}
      >
        <MastercardLogo />
      </span>
      <span
        role="img"
        aria-label="Elo"
        title="Elo"
        className={badgeClassName}
      >
        <EloLogo />
      </span>
      <span
        role="img"
        aria-label="American Express"
        title="American Express"
        className={badgeClassName}
      >
        <AmexLogo />
      </span>
      <span
        role="img"
        aria-label="Hipercard"
        title="Hipercard"
        className={badgeClassName}
      >
        <HipercardLogo />
      </span>
      <span
        role="img"
        aria-label="Diners Club"
        title="Diners Club"
        className={badgeClassName}
      >
        <DinersLogo />
      </span>
      <span
        role="img"
        aria-label="Discover"
        title="Discover"
        className={badgeClassName}
      >
        <DiscoverLogo />
      </span>
      <span
        role="img"
        aria-label="Maestro"
        title="Maestro"
        className={badgeClassName}
      >
        <MaestroLogo />
      </span>
    </div>
  );
};

export default CardBrandRow;
