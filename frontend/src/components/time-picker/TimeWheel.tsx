import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TimeWheelProps {
  value: number;
  onChange: (hour: number) => void;
  min?: number;
  max?: number;
  enableQuickSelect?: boolean;
}

const TimeWheel: React.FC<TimeWheelProps> = ({
  value,
  onChange,
  min = 0,
  max = 23,
  enableQuickSelect = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const index = hours.indexOf(value);
    if (index === -1) return;

    const itemHeight = 48;
    const targetScroll = index * itemHeight;
    container.scrollTop = targetScroll;
  }, [value, hours, min, max]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const itemHeight = 48;
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(hours.length - 1, index));
    const selectedHour = hours[clampedIndex];

    if (selectedHour !== value) {
      onChange(selectedHour);
    }
  }, [hours, value, onChange]);

  const handleQuickSelect = (hour: number) => {
    onChange(hour);
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
        {hours.map(hour => {
          const isSelected = hour === value;
          return (
            <motion.button
              key={hour}
              type="button"
              onClick={() => enableQuickSelect && handleQuickSelect(hour)}
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
              {hour.toString().padStart(2, '0')}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeWheel;
