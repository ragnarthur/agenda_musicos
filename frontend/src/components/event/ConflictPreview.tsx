// components/event/ConflictPreview.tsx
import React from 'react';
import { CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { Event } from '../../types';

interface ConflictInfo {
  loading: boolean;
  hasConflicts: boolean;
  conflicts: Event[];
  bufferMinutes: number;
}

interface ConflictPreviewProps {
  conflictInfo: ConflictInfo;
}

const ConflictPreview: React.FC<ConflictPreviewProps> = ({ conflictInfo }) => {
  const getStatusStyles = () => {
    if (conflictInfo.loading) {
      return 'bg-blue-50 border-blue-200 text-blue-700';
    }
    if (conflictInfo.hasConflicts) {
      return 'bg-red-50 border-red-200 text-red-700';
    }
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  };

  const getStatusIcon = () => {
    if (conflictInfo.loading) {
      return <ShieldCheck className="h-5 w-5 mt-0.5" />;
    }
    if (conflictInfo.hasConflicts) {
      return <AlertTriangle className="h-5 w-5 mt-0.5" />;
    }
    return <CheckCircle className="h-5 w-5 mt-0.5" />;
  };

  const getStatusMessage = () => {
    if (conflictInfo.loading) {
      return 'Checando conflitos...';
    }
    if (conflictInfo.hasConflicts) {
      return 'Conflitos encontrados para este horário';
    }
    return `Horário livre (considerando buffer de ${conflictInfo.bufferMinutes} min)`;
  };

  return (
    <div
      className={`rounded-lg border px-4 py-3 flex items-start space-x-3 ${getStatusStyles()}`}
      role="status"
      aria-live="polite"
    >
      {getStatusIcon()}
      <div className="flex-1 space-y-2">
        <p className="font-semibold">{getStatusMessage()}</p>
        {!conflictInfo.loading && conflictInfo.hasConflicts && (
            <div className="space-y-1 text-sm">
              {(conflictInfo?.conflicts || []).slice(0, 3).map((conflict) => (
              <div key={conflict.id} className="flex items-center justify-between">
                <span className="font-medium">{conflict.title}</span>
                <span className="text-xs text-gray-600">
                  {conflict.event_date} {conflict.start_time.slice(0, 5)}-{conflict.end_time.slice(0, 5)}
                </span>
              </div>
            ))}
            {conflictInfo.conflicts.length > 3 && (
              <p className="text-xs text-gray-700">
                +{conflictInfo.conflicts.length - 3} conflito(s) adicional(is) listado(s) na agenda.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictPreview;
