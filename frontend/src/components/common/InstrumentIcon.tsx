import React from 'react';
import { Guitar, Drum, Piano, Mic2, Music } from 'lucide-react';

type Props = {
  instrument: string;
  className?: string;
  size?: number;
};

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  acoustic_guitar: Guitar,
  guitar: Guitar,
  bass: Guitar,
  drums: Drum,
  keyboard: Piano,
  percussion: Drum,
  vocal: Mic2,
};

/**
 * Ícone de instrumento com base no nome retornado pela API.
 */
export const InstrumentIcon: React.FC<Props> = ({ instrument, className, size = 22 }) => {
  const IconComponent = iconMap[instrument] || Music;
  return <IconComponent size={size} className={className} />;
};

export default InstrumentIcon;
