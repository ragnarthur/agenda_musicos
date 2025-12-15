// components/event/AvailabilityPicker.tsx
import React from 'react';
import { Calendar, Clock, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { LeaderAvailability } from '../../types';

interface AvailabilityPickerProps {
  availabilities: LeaderAvailability[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  maxItems?: number;
}

const AvailabilityPicker: React.FC<AvailabilityPickerProps> = ({
  availabilities,
  selectedDate,
  onDateSelect,
  maxItems = 6,
}) => {
  if (availabilities.length === 0) {
    return null;
  }

  const displayedAvailabilities = availabilities.slice(0, maxItems);

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-2 mb-3">
        <Info className="h-5 w-5 text-gray-600" aria-hidden="true" />
        <h3 className="font-medium text-gray-900">Próximas disponibilidades do baterista</h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Escolha uma destas datas para facilitar a aprovação do evento:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="listbox" aria-label="Datas disponíveis">
        {displayedAvailabilities.map((availability) => (
          <button
            key={availability.id}
            type="button"
            onClick={() => onDateSelect(availability.date)}
            role="option"
            aria-selected={selectedDate === availability.date}
            className={`text-left p-3 rounded-lg border transition-colors ${
              selectedDate === availability.date
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <Calendar className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span className="font-medium text-gray-900">
                {format(parseISO(availability.date), 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span className="text-sm text-gray-600">
                {availability.start_time.slice(0, 5)} - {availability.end_time.slice(0, 5)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AvailabilityPicker;
