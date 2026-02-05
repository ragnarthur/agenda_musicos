import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Event } from '../../types';

interface DayEventsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: Event[];
  isOwner?: boolean;
}

const DayEventsSheet: React.FC<DayEventsSheetProps> = ({
  isOpen,
  onClose,
  date,
  events,
  isOwner = true,
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'confirmed':
      case 'approved':
        return 'bg-emerald-500';
      case 'proposed':
        return 'bg-amber-400';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: Event['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'approved':
        return 'Aprovado';
      case 'proposed':
        return 'Proposto';
      case 'rejected':
        return 'Rejeitado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && date && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
          >
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-lg max-h-[70vh] overflow-hidden shadow-2xl">
              {/* Handle bar */}
              <div className="flex justify-center py-2">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {events.length} {events.length === 1 ? 'evento' : 'eventos'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Events List */}
              <div className="overflow-y-auto max-h-[calc(70vh-100px)] pb-safe">
                {events.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum evento neste dia
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {events.map(event => (
                      (() => {
                        const isAvailability = (event as any).isAvailability === true;
                        const Wrapper: React.ElementType =
                          isOwner && !isAvailability ? Link : 'div';
                        const wrapperProps =
                          isOwner && !isAvailability
                            ? {
                                to: `/eventos/${event.id}`,
                                onClick: onClose,
                              }
                            : undefined;

                        return (
                          <Wrapper
                            key={event.id}
                            {...wrapperProps}
                            className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            {/* Status indicator */}
                            <div
                              className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getStatusColor(event.status)}`}
                            />

                            {/* Event details */}
                            <div className="flex-1 min-w-0">
                              {isOwner ? (
                                <>
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                      {event.title}
                                    </p>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                        event.status === 'confirmed' || event.status === 'approved'
                                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                          : event.status === 'proposed'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                      }`}
                                    >
                                      {getStatusLabel(event.status)}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    {event.start_time && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {event.start_time.slice(0, 5)}
                                        {event.end_time &&
                                          ` - ${event.end_time.slice(0, 5)}`}
                                      </span>
                                    )}
                                    {event.location && (
                                      <span className="flex items-center gap-1 truncate">
                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{event.location}</span>
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                        event.status === 'confirmed' || event.status === 'approved'
                                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                          : event.status === 'proposed'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                      }`}
                                    >
                                      {getStatusLabel(event.status)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    {event.start_time && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {event.start_time.slice(0, 5)}
                                        {event.end_time &&
                                          ` - ${event.end_time.slice(0, 5)}`}
                                      </span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Arrow */}
                            {isOwner && !isAvailability && (
                              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                            )}
                          </Wrapper>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DayEventsSheet;
