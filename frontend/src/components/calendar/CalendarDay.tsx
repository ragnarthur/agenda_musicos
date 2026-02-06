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

    // Determine background color based on event status
    const getEventBgClass = () => {
      if (isSelected || !isCurrentMonth) return '';
      if (eventStatus.hasConfirmed)
        return 'bg-emerald-100 dark:bg-emerald-300/25 text-emerald-900 dark:text-emerald-50';
      if (eventStatus.hasCompleted)
        return 'bg-purple-100 dark:bg-purple-300/25 text-purple-900 dark:text-purple-50';
      if (eventStatus.hasAvailability)
        return 'bg-blue-100 dark:bg-sky-300/25 text-blue-900 dark:text-sky-50';
      return '';
    };

    // Build class names
    const baseClasses =
      'relative flex flex-col items-center justify-center aspect-square min-h-[44px] sm:min-h-[48px] rounded-lg transition-all duration-150 touch-manipulation active:scale-95';

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

    const eventBgClass = getEventBgClass();

    const cellClasses = [
      baseClasses,
      monthClasses,
      todayClasses,
      selectedClasses,
      eventBgClass,
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
      </button>
    );
  }
);

CalendarDay.displayName = 'CalendarDay';

export default CalendarDay;
