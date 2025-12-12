// pages/EventDetail.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Crown,
  Edit,
  Trash2,
  Ban,
} from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/api';
import type { Event, AvailabilityResponse } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLeader } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<AvailabilityResponse>('pending');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await eventService.getById(parseInt(id));
      setEvent(data);

      // Buscar disponibilidade do usuário logado
      const myAvailability = data.availabilities?.find(
        (a) => a.musician.user.id === user?.user.id
      );

      if (myAvailability) {
        setSelectedResponse(myAvailability.response);
        setNotes(myAvailability.notes || '');
      }
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
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
      await loadEvent();
    } catch (error) {
      console.error('Erro ao marcar disponibilidade:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;

    try {
      setActionLoading(true);
      await eventService.approve(parseInt(id));
      await loadEvent();
    } catch (error) {
      console.error('Erro ao aprovar evento:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      setActionLoading(true);
      await eventService.delete(parseInt(id));
      navigate('/eventos');
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
      alert('Erro ao deletar evento. Tente novamente.');
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
      await loadEvent();
    } catch (error) {
      console.error('Erro ao cancelar evento:', error);
      alert('Erro ao cancelar evento. Tente novamente.');
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
      setShowRejectModal(false);
      await loadEvent();
    } catch (error) {
      console.error('Erro ao rejeitar evento:', error);
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

  const availabilityCounts = {
    available: event.availabilities?.filter((a) => a.response === 'available').length || 0,
    unavailable: event.availabilities?.filter((a) => a.response === 'unavailable').length || 0,
    maybe: event.availabilities?.filter((a) => a.response === 'maybe').length || 0,
    pending: event.availabilities?.filter((a) => a.response === 'pending').length || 0,
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
              <p className="mt-2 text-gray-600">{event.description}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`badge badge-${event.status}`}>{event.status_display}</span>

              {/* Ações do Criador */}
              {event.created_by === user?.user.id && event.status !== 'cancelled' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate(`/eventos/${event.id}/editar`)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar evento"
                  >
                    <Edit className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Cancelar evento"
                  >
                    <Ban className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir evento"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informações do Evento */}
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

          {/* Minha Disponibilidade */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Sua Disponibilidade</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Você está disponível?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedResponse('available')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedResponse === 'available'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <CheckCircle className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">Disponível</p>
                  </button>

                  <button
                    onClick={() => setSelectedResponse('unavailable')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedResponse === 'unavailable'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <XCircle className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">Indisponível</p>
                  </button>

                  <button
                    onClick={() => setSelectedResponse('maybe')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedResponse === 'maybe'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <HelpCircle className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">Talvez</p>
                  </button>

                  <button
                    onClick={() => setSelectedResponse('pending')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedResponse === 'pending'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 hover:border-yellow-300'
                    }`}
                  >
                    <Clock className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">Pendente</p>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="Adicione alguma observação..."
                />
              </div>

              <button
                onClick={handleSetAvailability}
                disabled={actionLoading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {actionLoading ? 'Salvando...' : 'Salvar Disponibilidade'}
              </button>
            </div>
          </div>
        </div>

        {/* Ações do Baterista */}
        {isLeader && event.status === 'proposed' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações do Baterista</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 btn-primary flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700"
              >
                <ThumbsUp className="h-5 w-5" />
                <span>Aprovar Evento</span>
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="flex-1 btn-danger flex items-center justify-center space-x-2"
              >
                <ThumbsDown className="h-5 w-5" />
                <span>Rejeitar Evento</span>
              </button>
            </div>
          </div>
        )}

        {/* Disponibilidade de Todos os Músicos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Disponibilidade dos Músicos</h2>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-green-600 font-medium">✓ {availabilityCounts.available}</span>
              <span className="text-red-600 font-medium">✗ {availabilityCounts.unavailable}</span>
              <span className="text-blue-600 font-medium">? {availabilityCounts.maybe}</span>
              <span className="text-yellow-600 font-medium">⏱ {availabilityCounts.pending}</span>
            </div>
          </div>

          <div className="space-y-3">
            {event.availabilities?.map((availability) => (
              <div
                key={availability.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {availability.musician.is_leader && (
                      <Crown className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {availability.musician.full_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {availability.musician.instrument &&
                        `${availability.musician.instrument.charAt(0).toUpperCase()}${availability.musician.instrument.slice(1)}`}
                    </p>
                    {availability.notes && (
                      <p className="text-sm text-gray-600 mt-1">"{availability.notes}"</p>
                    )}
                  </div>
                </div>

                <span className={`badge badge-${availability.response}`}>
                  {availability.response === 'available' && '✓ Disponível'}
                  {availability.response === 'unavailable' && '✗ Indisponível'}
                  {availability.response === 'maybe' && '? Talvez'}
                  {availability.response === 'pending' && '⏱ Pendente'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal de Rejeição */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Rejeitar Evento</h3>

              <div className="mb-4">
                <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo da rejeição
                </label>
                <textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="input-field"
                  placeholder="Explique o motivo da rejeição..."
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || actionLoading}
                  className="btn-danger disabled:opacity-50"
                >
                  {actionLoading ? 'Rejeitando...' : 'Confirmar Rejeição'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Cancelamento */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cancelar Evento</h3>

              <p className="text-gray-600 mb-6">
                Tem certeza que deseja cancelar este evento? Esta ação marcará o evento como cancelado,
                mas ele permanecerá no histórico.
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={actionLoading}
                  className="btn-secondary disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="btn-danger disabled:opacity-50 flex items-center space-x-2"
                >
                  <Ban className="h-5 w-5" />
                  <span>{actionLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Exclusão */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center space-x-2">
                <Trash2 className="h-6 w-6" />
                <span>Excluir Evento</span>
              </h3>

              <p className="text-gray-600 mb-6">
                <strong>Atenção:</strong> Esta ação é irreversível! O evento será excluído permanentemente
                do sistema e não poderá ser recuperado.
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={actionLoading}
                  className="btn-secondary disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="btn-danger disabled:opacity-50 flex items-center space-x-2"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>{actionLoading ? 'Excluindo...' : 'Excluir Permanentemente'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventDetail;
