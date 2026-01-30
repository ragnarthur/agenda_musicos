import React, { memo } from 'react';
import { type Event } from '../../types';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Zap, CalendarClock } from 'lucide-react';

interface NextEventCardProps {
  event: Event;
}

const NextEventCard: React.FC<NextEventCardProps> = memo(({ event }) => {
  const isTodayEvent = isToday(event.event_date);
  const startTime =
    event.event_date && event.start_time
      ? `${event.event_date}T${event.start_time}`
      : event.start_datetime;

  return (
    <div className="rounded-[18px] border border-white/60 bg-white/85 backdrop-blur p-4 shadow-lg flex-1">
      <div className="flex items-start gap-2 text-xs font-semibold text-primary-700 uppercase">
        <Zap className="h-4 w-4 text-primary-600" />
        Evento mais próximo
      </div>
      {isTodayEvent && (
        <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
          Hoje
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900 line-clamp-2">{event.title}</p>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <CalendarClock className="h-3.5 w-3.5" />
          <time dateTime={startTime} className="text-xs text-gray-600">
            {startTime ? format(startTime, "dd 'MMM'", { locale: ptBR }) : 'Data não definida'}
          </time>
        </div>
      </div>
    </div>
  );
});
NextEventCard.displayName = 'NextEventCard';

export default NextEventCard;
