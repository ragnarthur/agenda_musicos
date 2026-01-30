import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { type Event } from '../../types';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = memo(({ event }) => {
  const startTime =
    event.start_datetime ||
    (event.event_date && event.start_time ? `${event.event_date}T${event.start_time}` : '');

  const formatDateTime = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTimeString;
    }
  };

  const timeDisplay = formatDateTime(startTime);

  return (
    <Link
      to={`/eventos/${event.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border-gray-200 dark:border-gray-700 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5]"
    >
      <div className="flex items-center gap-3 mb-2">
        <CalendarClock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {timeDisplay}
        </span>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{event.title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
        {event.location || 'Local não definido'}
      </p>
    </Link>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
