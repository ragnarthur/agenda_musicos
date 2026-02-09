import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Clock, X, Check } from 'lucide-react';
import SwipeToDismissWrapper from '../modals/SwipeToDismissWrapper';
import TimeWheel from './TimeWheel';
import MinuteWheel from './MinuteWheel';

interface TimePickerBottomSheetProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  durationPresets?: { label: string; minutes: number }[];
  onDurationPreset?: (minutes: number) => void;
  showDurationPresets?: boolean;
  enableQuickSelect?: boolean;
}

const TimePickerBottomSheet: React.FC<TimePickerBottomSheetProps> = ({
  isOpen,
  value,
  onChange,
  onClose,
  durationPresets = [],
  onDurationPreset,
  showDurationPresets = false,
  enableQuickSelect = false,
}) => {
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    if (isOpen) {
      setTempValue(value);
    }
  }, [isOpen, value]);

  const [hour, minute] = tempValue.split(':').map(Number);

  const handleHourChange = (newHour: number) => {
    const newMinute = String(minute).padStart(2, '0');
    setTempValue(`${String(newHour).padStart(2, '0')}:${newMinute}`);
  };

  const handleMinuteChange = (newMinute: number) => {
    setTempValue(`${String(hour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`);
  };

  const handleConfirm = () => {
    onChange(tempValue);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 sm:bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <SwipeToDismissWrapper isOpen={isOpen} onClose={onClose}>
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.25, type: 'spring', damping: 25 }}
          onKeyDown={handleKeyDown}
          className="relative w-full max-w-lg bg-white sm:rounded-2xl sm:max-h-[600px] overflow-hidden shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timepicker-title"
        >
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary-600" />
                <h2
                  id="timepicker-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Selecione o horário
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-gray-900 mb-1">
                  {tempValue || '--:--'}
                </div>
                <p className="text-sm text-gray-500">Horário selecionado</p>
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-3 text-center uppercase tracking-wide">
                  Hora
                </p>
                <TimeWheel
                  value={hour}
                  onChange={handleHourChange}
                  enableQuickSelect={enableQuickSelect}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-3 text-center uppercase tracking-wide">
                  Minuto
                </p>
                <MinuteWheel
                  value={minute}
                  onChange={handleMinuteChange}
                  enableQuickSelect={enableQuickSelect}
                />
              </div>
            </div>

            {showDurationPresets && durationPresets.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  Duração rápida
                </p>
                <div className="flex flex-wrap gap-2">
                  {durationPresets.map(preset => (
                    <motion.button
                      key={preset.minutes}
                      type="button"
                      onClick={() => {
                        onDurationPreset?.(preset.minutes);
                        onClose();
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 transition hover:border-primary-400 hover:bg-primary-50 active:border-primary-500 active:bg-primary-100 min-h-[44px] touch-manipulation"
                    >
                      {preset.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 transition hover:bg-gray-50 min-h-[44px] touch-manipulation"
              >
                Cancelar
              </motion.button>
              <motion.button
                type="button"
                onClick={handleConfirm}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 px-4 py-3 rounded-lg bg-primary-600 text-white text-sm font-medium transition hover:bg-primary-700 min-h-[44px] touch-manipulation flex items-center justify-center gap-2 shadow-lg shadow-primary-200/60"
              >
                <Check className="h-4 w-4" />
                Confirmar
              </motion.button>
            </div>
          </div>
        </motion.div>
      </SwipeToDismissWrapper>
    </div>
  );

  return createPortal(content, document.body);
};

export default TimePickerBottomSheet;