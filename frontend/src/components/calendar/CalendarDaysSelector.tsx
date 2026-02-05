import React from 'react';
import { motion } from 'framer-motion';

interface CalendarDaysSelectorProps {
  selectedDays: number;
  onDaysChange: (days: number) => void;
  eventCount?: number;
  className?: string;
}

const DAYS_OPTIONS = [
  { value: 30, label: '30 dias', short: '30d' },
  { value: 60, label: '60 dias', short: '60d' },
  { value: 90, label: '90 dias', short: '90d' },
];

const CalendarDaysSelector: React.FC<CalendarDaysSelectorProps> = ({
  selectedDays,
  onDaysChange,
  eventCount,
  className,
}) => {
  return (
    <div className={`flex items-center gap-1 ${className || ''}`}>
      {DAYS_OPTIONS.map((option, index) => {
        const isSelected = selectedDays === option.value;

        return (
          <motion.button
            key={option.value}
            onClick={() => onDaysChange(option.value)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              touch-manipulation min-h-[44px]
              ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-200/60'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
          >
            {option.short}

            {/* Event count badge - apenas no primeiro se houver eventos */}
            {!isSelected && eventCount !== undefined && index === 0 && eventCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              >
                {eventCount}
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default CalendarDaysSelector;
