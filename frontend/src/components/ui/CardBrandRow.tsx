// components/ui/CardBrandRow.tsx
import React from 'react';

const VisaLogo = () => (
  <svg viewBox="0 0 64 24" className="h-4 w-auto" aria-hidden="true">
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
  <svg viewBox="0 0 64 24" className="h-4 w-auto" aria-hidden="true">
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
  <svg viewBox="0 0 64 24" className="h-4 w-auto" aria-hidden="true">
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
  <svg viewBox="0 0 64 24" className="h-4 w-auto" aria-hidden="true">
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

type CardBrandRowProps = {
  className?: string;
};

const CardBrandRow: React.FC<CardBrandRowProps> = ({ className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <span
        role="img"
        aria-label="Visa"
        title="Visa"
        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm"
      >
        <VisaLogo />
      </span>
      <span
        role="img"
        aria-label="Mastercard"
        title="Mastercard"
        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm"
      >
        <MastercardLogo />
      </span>
      <span
        role="img"
        aria-label="Elo"
        title="Elo"
        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm"
      >
        <EloLogo />
      </span>
      <span
        role="img"
        aria-label="American Express"
        title="American Express"
        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm"
      >
        <AmexLogo />
      </span>
    </div>
  );
};

export default CardBrandRow;
