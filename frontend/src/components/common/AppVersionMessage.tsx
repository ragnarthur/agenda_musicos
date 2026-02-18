import React from 'react';

interface AppVersionMessageProps {
  className?: string;
}

const formatReleaseLabel = (rawLabel: string): string => {
  const normalized = rawLabel.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Canal estavel';

  const buildWithDate = normalized.match(/^build\s+(\d{4})[./-](\d{2})[./-](\d{2})$/i);
  if (buildWithDate) {
    const [, year, month, day] = buildWithDate;
    return `Build de ${day}/${month}/${year}`;
  }

  const dateOnly = normalized.match(/^(\d{4})[./-](\d{2})[./-](\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `Build de ${day}/${month}/${year}`;
  }

  const semver = normalized.match(/^\d+\.\d+\.\d+$/);
  if (semver) {
    return `v${normalized}`;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const resolveReleaseLabel = (): string => {
  const rawRelease = String(import.meta.env.VITE_RELEASE_LABEL || '').trim();
  if (rawRelease) return formatReleaseLabel(rawRelease);

  const rawVersion = String(import.meta.env.VITE_APP_VERSION || '').trim();
  if (rawVersion) return formatReleaseLabel(rawVersion);

  return formatReleaseLabel('');
};

const AppVersionMessage: React.FC<AppVersionMessageProps> = ({ className = '' }) => {
  const releaseLabel = resolveReleaseLabel();

  return <p className={className}>Versao do aplicativo: {releaseLabel}.</p>;
};

export default AppVersionMessage;
