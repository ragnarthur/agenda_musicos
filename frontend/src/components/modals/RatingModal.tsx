// components/modals/RatingModal.tsx
import React, { useState, useEffect } from 'react';
import { Star, X, Send } from 'lucide-react';
import type { Availability, RatingInput } from '../../types';
import { formatInstrumentLabel } from '../../utils/formatting';
import SwipeToDismissWrapper from './SwipeToDismissWrapper';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ratings: RatingInput[]) => Promise<void>;
  availabilities: Availability[];
  eventTitle: string;
  loading?: boolean;
  currentUserId?: number;
}

interface MusicianRatingState {
  musician_id: number;
  musician_name: string;
  instrument: string;
  rating: number;
  comment: string;
}

const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availabilities,
  eventTitle,
  loading = false,
  currentUserId,
}) => {
  // Inicializa ratings para cada músico (apenas os que aceitaram)
  const [ratings, setRatings] = useState<MusicianRatingState[]>([]);
  const [error, setError] = useState<string>('');

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const initialRatings: MusicianRatingState[] = availabilities
      .filter(
        a =>
          a.response === 'available' &&
          (!currentUserId || a.musician.user?.id !== currentUserId)
      )
      .map(a => ({
        musician_id: a.musician.id,
        musician_name:
          a.musician.full_name ||
          a.musician.user?.full_name ||
          `${a.musician.user?.first_name || ''} ${a.musician.user?.last_name || ''}`.trim() ||
          a.musician.user?.username ||
          'Músico',
        instrument: formatInstrumentLabel(a.musician.instrument),
        rating: 0,
        comment: '',
      }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRatings(initialRatings);
  }, [availabilities, isOpen]);

  if (!isOpen) return null;

  const handleRatingChange = (musicianId: number, rating: number) => {
    setRatings(prev => prev.map(r => (r.musician_id === musicianId ? { ...r, rating } : r)));
    setError('');
  };

  const handleCommentChange = (musicianId: number, comment: string) => {
    setRatings(prev => prev.map(r => (r.musician_id === musicianId ? { ...r, comment } : r)));
  };

  const handleSubmit = async () => {
    // Valida que todos têm rating
    const missingRatings = ratings.filter(r => r.rating === 0);
    if (missingRatings.length > 0) {
      setError(`Avalie todos os músicos antes de enviar.`);
      return;
    }

    const ratingsToSubmit: RatingInput[] = ratings.map(r => ({
      musician_id: r.musician_id,
      rating: r.rating,
      comment: r.comment || undefined,
    }));

    await onSubmit(ratingsToSubmit);
  };

  const renderStars = (musicianId: number, currentRating: number) => {
    return (
      <div className="flex items-center gap-0.5 sm:gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingChange(musicianId, star)}
            className={`p-2 sm:p-3 transition-all hover:scale-110 active:scale-95 touch-manipulation ${
              star <= currentRating ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
            }`}
            aria-label={`${star} estrelas`}
          >
            <Star
              className="h-6 w-6 sm:h-7 sm:w-7"
              fill={star <= currentRating ? 'currentColor' : 'none'}
            />
          </button>
        ))}
        <span className="ml-2 text-xs sm:text-sm text-gray-500">
          {currentRating > 0 ? `${currentRating}/5` : 'Selecione'}
        </span>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center sm:p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-modal-title"
    >
      <SwipeToDismissWrapper isOpen={isOpen} onClose={onClose}>
        <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-lg w-full max-h-[85svh] sm:max-h-[90svh] overflow-hidden flex flex-col pb-safe pt-safe">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
            <div>
              <h3
                id="rating-modal-title"
                className="text-xl font-bold text-gray-900 flex items-center gap-2"
              >
                <Star className="h-5 w-5 text-yellow-500" />
                Avaliar Músicos
              </h3>
              <p className="text-sm text-gray-500 mt-1">{eventTitle}</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-3 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-6">
            {ratings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nenhum músico disponível para avaliação.
              </p>
            ) : (
              ratings.map(r => (
                <div key={r.musician_id} className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{r.musician_name}</p>
                      <p className="text-sm text-gray-500">{r.instrument}</p>
                    </div>
                  </div>

                  {renderStars(r.musician_id, r.rating)}

                  <textarea
                    value={r.comment}
                    onChange={e => handleCommentChange(r.musician_id, e.target.value)}
                    placeholder="Comentário opcional..."
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 resize-none"
                  />
                </div>
              ))
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 p-4 sm:p-5 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || ratings.length === 0}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              <span>{loading ? 'Enviando...' : 'Enviar Avaliações'}</span>
            </button>
          </div>
        </div>
      </SwipeToDismissWrapper>
    </div>
  );
};

export default RatingModal;
