// components/event/ProposalSummary.tsx
import React from 'react';
import { Target, ShieldCheck, Sparkles, Users, CheckCircle } from 'lucide-react';
import type { LeaderAvailability, AvailableMusician } from '../../types';

interface ProposalSummaryProps {
  formattedDate: string;
  startTime: string;
  endTime: string;
  duration: string | null;
  isSolo: boolean;
  matchingAvailability: LeaderAvailability | null;
  selectedMusicians?: number[];
  availableMusicians?: AvailableMusician[];
}

const ProposalSummary: React.FC<ProposalSummaryProps> = ({
  formattedDate,
  startTime,
  endTime,
  duration,
  isSolo,
  matchingAvailability,
  selectedMusicians = [],
  availableMusicians = [],
}) => {
  const selectedMusicianDetails = availableMusicians.filter(m =>
    selectedMusicians.includes(m.musician_id)
  );

  return (
    <aside className="space-y-5">
      <div className="rounded-2xl border border-white/50 bg-white/90 p-5 shadow-xl backdrop-blur">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900">Resumo da Proposta</h3>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <dt className="text-gray-500">Data</dt>
            <dd className="font-semibold text-gray-900">{formattedDate}</dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <dt className="text-gray-500">Horário</dt>
            <dd className="font-semibold text-gray-900">
              {startTime ? startTime.slice(0, 5) : '--:--'} às{' '}
              {endTime ? endTime.slice(0, 5) : '--:--'}
            </dd>
          </div>
          <div className="flex justify-between border-b border-gray-100 pb-3">
            <dt className="text-gray-500">Duração</dt>
            <dd className="font-semibold text-gray-900">{duration ?? 'Pendente'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Formato</dt>
            <dd className="font-semibold text-gray-900">
              {isSolo ? 'Show solo' : selectedMusicians.length > 0 ? `${selectedMusicians.length + 1} músicos` : 'Aguardando seleção'}
            </dd>
          </div>
        </dl>

        {/* Músicos selecionados */}
        {!isSolo && selectedMusicianDetails.length > 0 && (
          <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
            <p className="flex items-center font-semibold mb-2">
              <Users className="mr-2 h-4 w-4" aria-hidden="true" /> Músicos convidados
            </p>
            <ul className="space-y-1">
              {selectedMusicianDetails.map(m => (
                <li key={m.musician_id} className="text-xs flex items-center gap-1">
                  • {m.musician_name} ({m.instrument_display})
                  {m.has_availability && (
                    <CheckCircle className="h-3 w-3 text-green-600" aria-label="Disponibilidade confirmada" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {matchingAvailability && !isSolo && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <p className="flex items-center font-semibold">
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" /> Disponibilidade confirmada
            </p>
            <p className="mt-1">
              {matchingAvailability.start_time.slice(0, 5)} - {matchingAvailability.end_time.slice(0, 5)}
            </p>
            {matchingAvailability.notes && (
              <p className="mt-1 text-green-700">{matchingAvailability.notes}</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/85 p-5 text-sm shadow-lg backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-600" aria-hidden="true" />
          <p className="font-semibold text-gray-900">Dicas rápidas</p>
        </div>
        <ul className="space-y-3 text-gray-700">
          <li>
            <strong className="text-gray-900">Convide músicos:</strong> selecione qualquer músico da
            banda. Músicos com disponibilidade publicada aparecem em destaque.
          </li>
          <li>
            <strong className="text-gray-900">Confirmação:</strong> o evento só é confirmado quando
            todos os músicos convidados aceitarem o convite.
          </li>
          <li>
            <strong className="text-gray-900">Show solo:</strong> marque esta opção se você for tocar
            sozinho. O evento é aprovado automaticamente.
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default ProposalSummary;
