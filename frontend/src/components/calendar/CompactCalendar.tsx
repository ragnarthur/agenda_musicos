import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CalendarDay from './CalendarDay';
import DayEventsSheet from './DayEventsSheet';
import { useCalendarEvents } from './useCalendarEvents';
import type { Event } from '../../types';

interface CompactCalendarProps {
  events: Event[];
  onDaySelect?: (date: string) => void;
  className?: string;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const CompactCalendar: React.FC<CompactCalendarProps> = memo(
  ({ events, onDaySelect, className }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showEventsSheet, setShowEventsSheet] = useState(false);

    const { eventsByDate, getDateStatus } = useCalendarEvents(events);

    // Generate calendar days for the current month view
    const calendarDays = useMemo(() => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [currentMonth]);

    // Navigation handlers
    const goToPreviousMonth = useCallback(
      () => setCurrentMonth(prev => subMonths(prev, 1)),
      []
    );
    const goToNextMonth = useCallback(
      () => setCurrentMonth(prev => addMonths(prev, 1)),
      []
    );

    // Day selection handler
    const handleDaySelect = useCallback(
      (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        setSelectedDate(date);

        // Always open sheet when selecting a day (show empty state if no events)
        setShowEventsSheet(true);

        onDaySelect?.(dateStr);
      },
      [onDaySelect]
    );

    // Swipe handlers for month navigation
    const handleDragEnd = useCallback(
      (_: unknown, { offset, velocity }: PanInfo) => {
        const swipeThreshold = 50;
        const swipePower = Math.abs(offset.x) * velocity.x;

        if (offset.x > swipeThreshold || swipePower > 500) {
          goToPreviousMonth();
        } else if (offset.x < -swipeThreshold || swipePower < -500) {
          goToNextMonth();
        }
      },
      [goToPreviousMonth, goToNextMonth]
    );

    // Get events for selected date
    const selectedDateEvents = useMemo(() => {
      if (!selectedDate) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      return eventsByDate[dateStr] || [];
    }, [selectedDate, eventsByDate]);

    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 ${className || ''}`}
      >
        {/* Header with title */}
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Agenda
          </span>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>

          <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((day, index) => (
            <div
              key={index}
              className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid with swipe */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          className="grid grid-cols-7 gap-1"
        >
          {calendarDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            return (
              <CalendarDay
                key={dateStr}
                date={day}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isToday={isToday(day)}
                isSelected={selectedDate ? isSameDay(day, selectedDate) : false}
                eventStatus={getDateStatus(dateStr)}
                onSelect={() => handleDaySelect(day)}
              />
            );
          })}
        </motion.div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Confirmado
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Proposto
            </span>
          </div>
        </div>

        {/* Day Events Sheet */}
        <DayEventsSheet
          isOpen={showEventsSheet}
          onClose={() => setShowEventsSheet(false)}
          date={selectedDate}
          events={selectedDateEvents}
        />
      </div>
    );
  }
);

CompactCalendar.displayName = 'CompactCalendar';

export default CompactCalendar;
