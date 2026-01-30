// components/event/EventTimeline.tsx
import React, { memo } from 'react';
import { History, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { EventLog } from '../../types';

interface EventTimelineProps {
  logs: EventLog[];
  maxItems?: number;
}

const EventTimeline: React.FC<EventTimelineProps> = memo(({ logs, maxItems = 20 }) => {
  if (!logs || logs.length === 0) {
    return null;
  }

  const displayedLogs = logs.slice(0, maxItems);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <History className="h-5 w-5" aria-hidden="true" />
          <span>Linha do Tempo</span>
        </h2>
        <span className="text-xs text-gray-500">
          {logs.length > maxItems ? `Últimos ${maxItems} registros` : `${logs.length} registros`}
        </span>
      </div>

      <div className="space-y-3" role="list" aria-label="Histórico do evento">
        {displayedLogs.map(log => (
          <div
            key={log.id}
            className="flex items-start space-x-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
            role="listitem"
          >
            <div className="mt-0.5">
              <Activity className="h-4 w-4 text-primary-600" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{log.description}</p>
              <p className="text-xs text-gray-600">
                {log.performed_by_name} •{' '}
                {format(parseISO(log.created_at), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

EventTimeline.displayName = 'EventTimeline';

export default EventTimeline;
