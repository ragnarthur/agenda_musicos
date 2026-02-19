// components/musicians/MiniDatePicker.tsx
import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MiniDatePickerProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  onClear: () => void;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const MiniDatePicker: React.FC<MiniDatePickerProps> = memo(
  ({ selectedDate, onDateSelect, onClear }) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
      if (selectedDate) {
        try {
          return parseISO(selectedDate);
        } catch {
          return new Date();
        }
      }
      return new Date();
    });

    const selectedDateObj = useMemo(() => {
      if (!selectedDate) return null;
      try {
        return parseISO(selectedDate);
      } catch {
        return null;
      }
    }, [selectedDate]);

    const isCurrentMonthToday = isSameMonth(currentMonth, new Date());

    const calendarDays = useMemo(() => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [currentMonth]);

    const goToPreviousMonth = useCallback(() => {
      setCurrentMonth(prev => subMonths(prev, 1));
    }, []);

    const goToNextMonth = useCallback(() => {
      setCurrentMonth(prev => addMonths(prev, 1));
    }, []);

    const goToToday = useCallback(() => {
      setCurrentMonth(new Date());
    }, []);

    const handleDayClick = useCallback(
      (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        if (selectedDate === dateStr) {
          onClear();
        } else {
          onDateSelect(dateStr);
        }
      },
      [selectedDate, onDateSelect, onClear]
    );

    const handleDragEnd = useCallback(
      (_: unknown, { offset, velocity }: PanInfo) => {
        const swipePower = Math.abs(offset.x) * velocity.x;
        if (offset.x > 50 || swipePower > 500) {
          goToPreviousMonth();
        } else if (offset.x < -50 || swipePower < -500) {
          goToNextMonth();
        }
      },
      [goToPreviousMonth, goToNextMonth]
    );

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 w-full max-w-[320px]">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation active:scale-95"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="flex flex-col items-center"
            aria-label={isCurrentMonthToday ? 'Mês atual' : 'Voltar para hoje'}
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            {!isCurrentMonthToday && (
              <span className="text-[10px] text-primary-500 dark:text-primary-400 leading-tight">
                voltar para hoje
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation active:scale-95"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAY_LABELS.map((label, index) => (
            <div
              key={index}
              className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Days grid with swipe */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          className="grid grid-cols-7 gap-0.5"
        >
          {calendarDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonthDay = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            const isSelected = selectedDateObj ? isSameDay(day, selectedDateObj) : false;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={!isCurrentMonthDay}
                className={[
                  'relative flex items-center justify-center rounded-lg text-sm font-medium transition-all touch-manipulation select-none',
                  'h-9 w-full',
                  !isCurrentMonthDay && 'opacity-20 cursor-default pointer-events-none',
                  isSelected
                    ? 'bg-primary-600 text-white shadow-sm'
                    : isDayToday
                      ? 'ring-2 ring-primary-400 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                      : isCurrentMonthDay
                        ? 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'text-gray-400 dark:text-gray-600',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
                aria-pressed={isSelected}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </motion.div>
      </div>
    );
  }
);

MiniDatePicker.displayName = 'MiniDatePicker';

export default MiniDatePicker;
