import React from 'react';

interface AppVersionMessageProps {
  className?: string;
}

const resolveReleaseLabel = (): string => {
  const rawRelease = String(import.meta.env.VITE_RELEASE_LABEL || '').trim();
  if (rawRelease) return rawRelease;

  const rawVersion = String(import.meta.env.VITE_APP_VERSION || '').trim();
  if (rawVersion) return rawVersion;

  return 'canal estavel';
};

const AppVersionMessage: React.FC<AppVersionMessageProps> = ({ className = '' }) => {
  const releaseLabel = resolveReleaseLabel();

  return (
    <p className={className}>
      Versao de palco: {releaseLabel} · afinado para voce.
    </p>
  );
};

export default AppVersionMessage;
