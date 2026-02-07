// components/event/AvailabilityList.tsx
import React, { memo } from 'react';
import type { Availability } from '../../types';
import { INSTRUMENT_LABELS, AVAILABILITY_LABELS } from '../../utils/formatting';

interface AvailabilityListProps {
  availabilities: Availability[];
}

interface AvailabilityCounts {
  available: number;
  unavailable: number;
  pending: number;
}

const RESPONSE_ICONS: Record<string, string> = {
  available: '✓',
  unavailable: '✗',
  pending: '⏱',
};

const RESPONSE_BADGE_PREFIX: Record<string, string> = {
  available: '✓ ',
  unavailable: '✗ ',
  pending: '⏱ ',
};

function getAvailabilityCounts(availabilities: Availability[]): AvailabilityCounts {
  return availabilities.reduce(
    (acc, a) => {
      if (a.response in acc) {
        acc[a.response as keyof AvailabilityCounts]++;
      }
      return acc;
    },
    { available: 0, unavailable: 0, pending: 0 }
  );
}

function formatInstrument(instrument: string | undefined): string {
  if (!instrument) return '';
  return (
    INSTRUMENT_LABELS[instrument] || `${instrument.charAt(0).toUpperCase()}${instrument.slice(1)}`
  );
}

const AvailabilityList: React.FC<AvailabilityListProps> = memo(({ availabilities }) => {
  const counts = getAvailabilityCounts(availabilities);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Disponibilidade dos Músicos</h2>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-green-600 font-medium">
            {RESPONSE_ICONS.available} {counts.available}
          </span>
          <span className="text-red-600 font-medium">
            {RESPONSE_ICONS.unavailable} {counts.unavailable}
          </span>
          <span className="text-yellow-600 font-medium">
            {RESPONSE_ICONS.pending} {counts.pending}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {(availabilities || []).map(availability => (
          <div
            key={availability.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{availability.musician.full_name}</p>
                <p className="text-sm text-gray-500">
                  {formatInstrument(availability.musician.instrument)}
                </p>
                {availability.notes && (
                  <p className="text-sm text-gray-600 mt-1">"{availability.notes}"</p>
                )}
              </div>
            </div>

            <span className={`badge badge-${availability.response}`}>
              {RESPONSE_BADGE_PREFIX[availability.response]}
              {AVAILABILITY_LABELS[availability.response] || availability.response}
            </span>
          </div>
        ))}

        {availabilities.length === 0 && (
          <p className="text-gray-500 text-center py-4">Nenhuma disponibilidade registrada.</p>
        )}
      </div>
    </div>
  );
});

AvailabilityList.displayName = 'AvailabilityList';

export default AvailabilityList;
