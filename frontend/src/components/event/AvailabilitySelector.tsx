// components/event/AvailabilitySelector.tsx
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import type { AvailabilityResponse } from '../../types';

interface AvailabilitySelectorProps {
  selectedResponse: AvailabilityResponse;
  onResponseChange: (response: AvailabilityResponse) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  loading?: boolean;
}

const RESPONSE_OPTIONS: {
  value: AvailabilityResponse;
  label: string;
  icon: React.ReactNode;
  colors: { selected: string; default: string };
}[] = [
  {
    value: 'available',
    label: 'Disponível',
    icon: <CheckCircle className="h-6 w-6 mx-auto mb-1" />,
    colors: {
      selected: 'border-green-500 bg-green-50 text-green-700',
      default: 'border-gray-200 hover:border-green-300',
    },
  },
  {
    value: 'unavailable',
    label: 'Indisponível',
    icon: <XCircle className="h-6 w-6 mx-auto mb-1" />,
    colors: {
      selected: 'border-red-500 bg-red-50 text-red-700',
      default: 'border-gray-200 hover:border-red-300',
    },
  },
];

const AvailabilitySelector: React.FC<AvailabilitySelectorProps> = ({
  selectedResponse,
  onResponseChange,
  notes,
  onNotesChange,
  onSave,
  loading = false,
}) => {
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Sua Disponibilidade</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Você está disponível?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {RESPONSE_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => onResponseChange(option.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedResponse === option.value ? option.colors.selected : option.colors.default
                }`}
                aria-pressed={selectedResponse === option.value}
              >
                {option.icon}
                <p className="text-sm font-medium">{option.label}</p>
              </button>
            ))}
          </div>

          {/* "Pendente" e' um estado do sistema (convite enviado), nao uma opcao acionavel. */}
          <div className="mt-3 text-xs text-gray-600">
            Status atual:{' '}
            <span
              className={
                selectedResponse === 'available'
                  ? 'badge badge-available'
                  : selectedResponse === 'unavailable'
                    ? 'badge badge-unavailable'
                    : 'badge badge-pending'
              }
            >
              {selectedResponse === 'available'
                ? 'Disponível'
                : selectedResponse === 'unavailable'
                  ? 'Indisponível'
                  : 'Pendente'}
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="availability-notes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Observações
          </label>
          <textarea
            id="availability-notes"
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            rows={3}
            className="input-field"
            placeholder="Adicione alguma observação..."
          />
        </div>

        <button
          onClick={onSave}
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Disponibilidade'}
        </button>
      </div>
    </div>
  );
};

export default AvailabilitySelector;
