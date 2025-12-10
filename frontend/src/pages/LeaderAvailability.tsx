// pages/LeaderAvailability.tsx
import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Edit, Trash2, AlertCircle, Info } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { leaderAvailabilityService } from '../services/api';
import type { LeaderAvailability, LeaderAvailabilityCreate } from '../types';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const LeaderAvailabilityPage: React.FC = () => {
  const { isLeader } = useAuth();
  const [availabilities, setAvailabilities] = useState<LeaderAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const [formData, setFormData] = useState<LeaderAvailabilityCreate>({
    date: '',
    start_time: '',
    end_time: '',
    notes: '',
  });

  useEffect(() => {
    loadAvailabilities();
  }, [timeFilter]);

  const loadAvailabilities = async () => {
    try {
      setLoading(true);
      const params: Record<string, boolean> = {};

      if (timeFilter === 'upcoming') {
        params.upcoming = true;
      } else if (timeFilter === 'past') {
        params.past = true;
      }

      const data = await leaderAvailabilityService.getAll(params);
      setAvailabilities(data);
    } catch (error) {
      console.error('Erro ao carregar disponibilidades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);

    try {
      // Validações
      if (formData.end_time <= formData.start_time) {
        setError('O horário de término deve ser posterior ao horário de início');
        setActionLoading(false);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const availDate = new Date(formData.date);

      if (availDate < today) {
        setError('A data não pode ser no passado');
        setActionLoading(false);
        return;
      }

      if (editingId) {
        await leaderAvailabilityService.update(editingId, formData);
      } else {
        await leaderAvailabilityService.create(formData);
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      await loadAvailabilities();
    } catch (err) {
      console.error('Erro ao salvar disponibilidade:', err);
      const error = err as { response?: { data?: any } };
      if (error.response?.data) {
        const data = error.response.data;
        let errorMessage = 'Erro ao salvar disponibilidade. Tente novamente.';

        // Se data é uma string, use diretamente
        if (typeof data === 'string') {
          errorMessage = data;
        }
        // Se data é um objeto, tente extrair as mensagens
        else if (typeof data === 'object' && data !== null) {
          const messages: string[] = [];
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              messages.push(`${key}: ${value.join(', ')}`);
            } else {
              messages.push(`${key}: ${value}`);
            }
          }
          if (messages.length > 0) {
            errorMessage = messages.join('; ');
          }
        }

        setError(errorMessage);
      } else {
        setError('Erro ao salvar disponibilidade. Tente novamente.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (availability: LeaderAvailability) => {
    setEditingId(availability.id);
    setFormData({
      date: availability.date,
      start_time: availability.start_time,
      end_time: availability.end_time,
      notes: availability.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta disponibilidade?')) {
      return;
    }

    try {
      setActionLoading(true);
      await leaderAvailabilityService.delete(id);
      await loadAvailabilities();
    } catch (error) {
      console.error('Erro ao deletar disponibilidade:', error);
      alert('Erro ao deletar disponibilidade. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      start_time: '',
      end_time: '',
      notes: '',
    });
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    resetForm();
  };

  if (!isLeader) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">Apenas líderes podem acessar esta página.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Minhas Disponibilidades</h1>
            <p className="mt-2 text-gray-600">Cadastre datas e horários disponíveis para shows</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nova Disponibilidade</span>
          </button>
        </div>

        {/* Info sobre buffer de 40 minutos */}
        <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm text-blue-800">
            <p className="font-medium mb-1">Atenção: Buffer de 40 minutos</p>
            <p>
              O sistema considera automaticamente um intervalo de 40 minutos entre eventos.
              Se houver conflitos com eventos já cadastrados, você será avisado.
            </p>
          </div>
        </div>

        {/* Filtros de tempo */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[
            { value: 'upcoming', label: 'Próximas' },
            { value: 'all', label: 'Todas' },
            { value: 'past', label: 'Passadas' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeFilter(item.value as 'upcoming' | 'past' | 'all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                timeFilter === item.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Lista de disponibilidades */}
        {loading ? (
          <Loading text="Carregando disponibilidades..." />
        ) : availabilities.length === 0 ? (
          <div className="card text-center py-12">
            <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhuma disponibilidade cadastrada</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Cadastrar Primeira Disponibilidade</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {availabilities.map((availability) => (
              <div
                key={availability.id}
                className={`card ${availability.has_conflicts ? 'border-red-300 bg-red-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-gray-500" />
                      <span className="text-lg font-semibold text-gray-900">
                        {format(new Date(availability.date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 mb-2">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-700">
                        {availability.start_time.slice(0, 5)} - {availability.end_time.slice(0, 5)}
                      </span>
                    </div>
                    {availability.notes && (
                      <p className="text-sm text-gray-600 mt-2">{availability.notes}</p>
                    )}
                    {availability.has_conflicts && (
                      <div className="flex items-start space-x-2 mt-3 p-2 bg-red-100 rounded">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700">
                          <strong>Conflito detectado:</strong> {availability.conflicting_events_count}{' '}
                          evento(s) conflitam com esta disponibilidade (considerando buffer de 40 min)
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(availability)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(availability.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Deletar"
                      disabled={actionLoading}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de criar/editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingId ? 'Editar Disponibilidade' : 'Nova Disponibilidade'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Data */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>

                {/* Horários */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                      Início *
                    </label>
                    <input
                      id="start_time"
                      name="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                      Término *
                    </label>
                    <input
                      id="end_time"
                      name="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="input-field"
                    placeholder="Ex: Disponível para eventos até 3h de duração"
                  />
                </div>

                {/* Botões */}
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary"
                    disabled={actionLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LeaderAvailabilityPage;
