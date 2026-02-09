import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface MinuteWheelProps {
  value: number;
  onChange: (minute: number) => void;
  enableQuickSelect?: boolean;
}

const MinuteWheel: React.FC<MinuteWheelProps> = ({
  value,
  onChange,
  enableQuickSelect = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minutes = Array.from({ length: 60 }, (_, i) => i);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const index = minutes.indexOf(value);
    if (index === -1) return;

    const itemHeight = 48;
    const targetScroll = index * itemHeight;
    container.scrollTop = targetScroll;
  }, [value, minutes]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const itemHeight = 48;
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(minutes.length - 1, index));
    const selectedMinute = minutes[clampedIndex];

    if (selectedMinute !== value) {
      onChange(selectedMinute);
    }
  }, [minutes, value, onChange]);

  const handleQuickSelect = (minute: number) => {
    onChange(minute);
  };

  const getScrollSnapType = () => {
    return enableQuickSelect ? 'none' : 'y mandatory';
  };

  return (
    <div className="flex-1 overflow-hidden" ref={scrollRef}>
      <div
        ref={containerRef}
        className="h-48 overflow-y-auto snap-y-mandatory scrollbar-hide"
        style={{ scrollSnapType: getScrollSnapType() }}
        onScroll={!enableQuickSelect ? handleScroll : undefined}
      >
        {minutes.map(minute => {
          const isSelected = minute === value;
          return (
            <motion.button
              key={minute}
              type="button"
              onClick={() => enableQuickSelect && handleQuickSelect(minute)}
              whileHover={enableQuickSelect ? { scale: 1.05 } : {}}
              whileTap={enableQuickSelect ? { scale: 0.95 } : {}}
              className={`
                h-12 w-full flex items-center justify-center text-lg font-medium transition-all
                ${
                  isSelected
                    ? 'bg-primary-100 text-primary-700 font-bold scale-105 shadow-lg'
                    : 'text-gray-500 hover:bg-gray-50'
                }
                ${enableQuickSelect ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
              `}
            >
              {minute.toString().padStart(2, '0')}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MinuteWheel;