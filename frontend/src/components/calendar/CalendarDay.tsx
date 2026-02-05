import React, { memo } from 'react';
import type { DayEventStatus } from './useCalendarEvents';

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  eventStatus: DayEventStatus;
  onSelect: () => void;
}

const CalendarDay: React.FC<CalendarDayProps> = memo(
  ({ date, isCurrentMonth, isToday, isSelected, eventStatus, onSelect }) => {
    const dayNumber = date.getDate();

    // Build class names
    const baseClasses =
      'relative flex flex-col items-center justify-center aspect-square min-h-[40px] rounded-lg transition-all duration-150 touch-manipulation';

    const monthClasses = isCurrentMonth
      ? 'text-gray-900 dark:text-white'
      : 'text-gray-300 dark:text-gray-600';

    const todayClasses =
      isToday && !isSelected ? 'ring-2 ring-primary-400 ring-inset' : '';

    const selectedClasses = isSelected
      ? 'bg-primary-600 text-white'
      : isCurrentMonth
        ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
        : '';

    const hasEventsClasses =
      eventStatus.totalCount > 0 && !isSelected
        ? 'bg-gray-50 dark:bg-gray-800/50'
        : '';

    const cellClasses = [
      baseClasses,
      monthClasses,
      todayClasses,
      selectedClasses,
      hasEventsClasses,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        type="button"
        onClick={onSelect}
        className={cellClasses}
        aria-label={`${dayNumber} - ${eventStatus.totalCount} eventos`}
        aria-pressed={isSelected}
      >
        <span
          className={`text-sm font-medium ${isToday && !isSelected ? 'font-bold' : ''}`}
        >
          {dayNumber}
        </span>

        {/* Event indicator dots */}
        {eventStatus.totalCount > 0 && (
          <div className="absolute bottom-1 flex gap-0.5">
            {eventStatus.hasConfirmed && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}
              />
            )}
            {eventStatus.hasProposed && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-amber-400'}`}
              />
            )}
          </div>
        )}
      </button>
    );
  }
);

CalendarDay.displayName = 'CalendarDay';

export default CalendarDay;
