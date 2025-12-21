// pages/EventDetail.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Crown,
  Edit,
  Trash2,
  Ban,
  Star,
} from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import AvailabilitySelector from '../components/event/AvailabilitySelector';
import AvailabilityList from '../components/event/AvailabilityList';
import EventTimeline from '../components/event/EventTimeline';
import ConfirmModal from '../components/modals/ConfirmModal';
import RejectModal from '../components/modals/RejectModal';
import RatingModal from '../components/modals/RatingModal';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/api';
import { showToast } from '../utils/toast';
import type { Event, AvailabilityResponse, RatingInput } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getEventComputedStatus } from '../utils/events';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<AvailabilityResponse>('pending');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await eventService.getById(parseInt(id));
      setEvent(data);

      const myAvailability = data.availabilities?.find(
        (a) => a.musician.user.id === user?.user.id
      );

      if (myAvailability) {
        setSelectedResponse(myAvailability.response);
        setNotes(myAvailability.notes || '');
      }
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, [id, user?.user.id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleSetAvailability = async () => {
    if (!id) return;

    try {
      setActionLoading(true);
      await eventService.setAvailability(parseInt(id), selectedResponse, notes);
      showToast.availabilityUpdated();
      await loadEvent();
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;

    try {
      setActionLoading(true);
      await eventService.approve(parseInt(id));
      showToast.eventApproved();
      await loadEvent();
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      setActionLoading(true);
      await eventService.delete(parseInt(id));
      showToast.eventDeleted();
      navigate('/eventos');
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;

    try {
      setActionLoading(true);
      await eventService.cancel(parseInt(id));
      showToast.eventCancelled();
      await loadEvent();
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(false);
      setShowCancelModal(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectionReason.trim()) return;

    try {
      setActionLoading(true);
      await eventService.reject(parseInt(id), rejectionReason);
      showToast.eventRejected();
      setShowRejectModal(false);
      await loadEvent();
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRatings = async (ratings: RatingInput[]) => {
    if (!id) return;

    try {
      setActionLoading(true);
      await eventService.submitRatings(parseInt(id), ratings);
      showToast.ratingsSubmitted();
      setShowRatingModal(false);
      setRatingSuccess(true);
      await loadEvent();
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !event) {
    return (
      <Layout>
        <Loading text="Carregando evento..." />
      </Layout>
    );
  }

  const computedStatus = getEventComputedStatus(event);
  const approvalLabel = computedStatus.label;

  const isCreator = event.created_by === user?.user.id;
  const canEdit = isCreator && event.status !== 'cancelled';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{event.title}</h1>
              <p className="mt-2 text-gray-600 text-sm sm:text-base">{event.description}</p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
              <span className={`badge badge-${computedStatus.status}`}>{approvalLabel}</span>

              {canEdit && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => navigate(`/eventos/${event.id}/editar`)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar evento"
                    aria-label="Editar evento"
                  >
                    <Edit className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Cancelar evento"
                    aria-label="Cancelar evento"
                  >
                    <Ban className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir evento"
                    aria-label="Excluir evento"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informações do Evento e Disponibilidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Detalhes</h2>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="font-medium">
                    {format(parseISO(event.event_date), "EEEE, dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Horário</p>
                  <p className="font-medium">
                    {event.start_time.slice(0, 5)} - {event.end_time.slice(0, 5)}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Local</p>
                  <p className="font-medium">{event.location}</p>
                  {event.venue_contact && (
                    <p className="text-sm text-gray-600">{event.venue_contact}</p>
                  )}
                </div>
              </div>

              {event.payment_amount && (
                <div className="flex items-start space-x-3">
                  <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Cachê</p>
                    <p className="font-medium">R$ {event.payment_amount}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Criado por</p>
                  <p className="font-medium">{event.created_by_name}</p>
                </div>
              </div>

              {event.approved_by_name && (
                <div className="flex items-start space-x-3">
                  <Crown className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {event.status === 'approved' ? 'Aprovado por' : 'Rejeitado por'}
                    </p>
                    <p className="font-medium">{event.approved_by_name}</p>
                    {event.rejection_reason && (
                      <p className="text-sm text-red-600 mt-1">{event.rejection_reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <AvailabilitySelector
            selectedResponse={selectedResponse}
            onResponseChange={setSelectedResponse}
            notes={notes}
            onNotesChange={setNotes}
            onSave={handleSetAvailability}
            loading={actionLoading}
          />
        </div>

        {/* Ações de aprovação */}
        {event.status === 'proposed' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações de aprovação</h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 btn-primary flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <ThumbsUp className="h-5 w-5" />
                <span>Aprovar Evento</span>
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="flex-1 btn-danger flex items-center justify-center gap-2"
              >
                <ThumbsDown className="h-5 w-5" />
                <span>Rejeitar Evento</span>
              </button>
            </div>
          </div>
        )}

        {/* Seção de Avaliação de Músicos */}
        {(event.can_rate || ratingSuccess) && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Avaliação dos Músicos
            </h2>
            {ratingSuccess ? (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="font-medium">Avaliações enviadas com sucesso!</p>
                <p className="text-sm mt-1">Obrigado por avaliar os músicos deste evento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  O evento já ocorreu. Avalie os músicos que participaram para ajudar outros
                  contratantes a escolher os melhores profissionais.
                </p>
                <button
                  onClick={() => setShowRatingModal(true)}
                  disabled={actionLoading}
                  className="btn-primary flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600"
                >
                  <Star className="h-5 w-5" />
                  <span>Avaliar Músicos</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Disponibilidade de Todos os Músicos */}
        <AvailabilityList availabilities={event.availabilities || []} />

        {/* Histórico do Evento */}
        <EventTimeline logs={event.logs || []} />

        {/* Modals */}
        <RejectModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
          reason={rejectionReason}
          onReasonChange={setRejectionReason}
          loading={actionLoading}
        />

        <ConfirmModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancel}
          title="Cancelar Evento"
          message="Tem certeza que deseja cancelar este evento? Esta ação marcará o evento como cancelado, mas ele permanecerá no histórico."
          confirmText="Confirmar Cancelamento"
          confirmVariant="warning"
          loading={actionLoading}
          icon={<Ban className="h-5 w-5" />}
        />

        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Excluir Evento"
          message={
            <>
              <strong>Atenção:</strong> Esta ação é irreversível! O evento será excluído permanentemente
              do sistema e não poderá ser recuperado.
            </>
          }
          confirmText="Excluir Permanentemente"
          confirmVariant="danger"
          loading={actionLoading}
          icon={<Trash2 className="h-5 w-5" />}
        />

        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleSubmitRatings}
          availabilities={event.availabilities || []}
          eventTitle={event.title}
          loading={actionLoading}
        />
      </div>
    </Layout>
  );
};

export default EventDetail;
