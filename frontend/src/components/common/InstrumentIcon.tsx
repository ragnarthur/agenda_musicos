import React from 'react';
import { Icon } from '@iconify/react';

type Props = {
  instrument: string;
  className?: string;
  size?: number;
};

const iconMap: Record<string, string> = {
  acoustic_guitar: 'mdi:guitar-acoustic',
  guitar: 'mdi:guitar-electric',
  bass: 'mdi:guitar-electric',
  drums: 'mdi:drum',
  keyboard: 'mdi:piano',
  percussion: 'mdi:drum',
  vocal: 'mdi:microphone-variant',
};

/**
 * Ícone de instrumento com base no nome retornado pela API.
 */
export const InstrumentIcon: React.FC<Props> = ({ instrument, className, size = 22 }) => {
  const icon = iconMap[instrument] || 'mdi:music-circle';
  return <Icon icon={icon} width={size} height={size} className={className} />;
};

export default InstrumentIcon;
