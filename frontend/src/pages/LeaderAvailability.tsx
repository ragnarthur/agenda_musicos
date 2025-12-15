// pages/LeaderAvailability.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, Plus, Edit, Trash2, AlertCircle, Info, Users, Search, Share } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { leaderAvailabilityService } from '../services/api';
import type { LeaderAvailability, LeaderAvailabilityCreate } from '../types';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const LeaderAvailabilityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [availabilities, setAvailabilities] = useState<LeaderAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  // Lista de músicos removida (agrupamento por instrumento)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [showShared, setShowShared] = useState(false);
  const [instrumentFilter, setInstrumentFilter] = useState<'all' | Musician['instrument']>('all');

  const [formData, setFormData] = useState<LeaderAvailabilityCreate>({
    date: '',
    start_time: '',
    end_time: '',
    notes: '',
  });

  const loadAvailabilities = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | boolean> = {};

      if (timeFilter === 'upcoming') {
        params.upcoming = true;
      } else if (timeFilter === 'past') {
        params.past = true;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      if (instrumentFilter !== 'all') {
        params.instrument = instrumentFilter;
      }

      if (showShared) {
        params.public = true;
      } else {
        params.mine = true;
      }

      const data = await leaderAvailabilityService.getAll(params);
      setAvailabilities(data);
    } catch (error) {
      console.error('Erro ao carregar disponibilidades:', error);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, searchTerm, showShared, instrumentFilter]);

  useEffect(() => {
    loadAvailabilities();
  }, [loadAvailabilities]);

  useEffect(() => {
    // placeholder to keep future enhancements; for now musicians list is unused
    setMusicians([]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);

    try {
      // Validações: permite cruzar meia-noite, bloqueia duração zero
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };
      const startMinutes = toMinutes(formData.start_time);
      const endMinutes = toMinutes(formData.end_time);
      let duration = endMinutes - startMinutes;
      if (duration <= 0) {
        duration += 24 * 60;
      }
      if (duration <= 0) {
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
    } catch (err: unknown) {
      console.error('Erro ao salvar disponibilidade:', err);
      const error = err as { response?: { data?: unknown } };
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
      is_public: availability.is_public,
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
    } catch (error: unknown) {
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
      is_public: false,
    });
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    resetForm();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white p-6 shadow-xl">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_40%)]" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Agendas compartilhadas</h1>
              <p className="text-white/80 max-w-2xl text-sm sm:text-base">
                Cadastre seus horários livres, escolha tornar públicos ou privados e receba convites sem overbooking.
                O sistema já respeita 40 minutos de buffer entre gigs.
              </p>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ideal para duos, trios e freelas rápidos</span>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center space-x-2 shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>Nova disponibilidade</span>
            </button>
          </div>
        </div>

        {/* Info sobre buffer de 40 minutos */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/90 backdrop-blur p-4 shadow-lg">
          <div className="spotlight pointer-events-none absolute inset-0 -z-10" />
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-primary-800">
              <p className="font-medium mb-1">Buffer automático de 40 minutos</p>
              <p>
                Bloqueamos 40 minutos antes/depois de cada gig para deslocamento e setup. Isso evita overbooking e mantém sua agenda realista.
              </p>
            </div>
          </div>
        </div>

        {/* Filtros de tempo */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:space-x-3">
            <button
              onClick={() => setShowShared((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showShared ? 'bg-primary-600 text-white border-primary-600 shadow' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Share className="h-4 w-4" />
              <span>{showShared ? 'Mostrando públicas' : 'Ver agendas compartilhadas'}</span>
            </button>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="Buscar músico por nome/usuário"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <select
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                value={instrumentFilter}
                onChange={(e) => setInstrumentFilter(e.target.value as typeof instrumentFilter)}
              >
                <option value="all">Todos os instrumentos</option>
                <option value="vocal">Vocal</option>
                <option value="guitar">Guitarra/Violão</option>
                <option value="bass">Baixo</option>
                <option value="drums">Bateria</option>
                <option value="keyboard">Teclado</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
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
            {availabilities.map((availability) => {
              const isOwner = availability.leader === user?.id;
              return (
                <div
                  key={availability.id}
                  className={`card-contrast ${availability.has_conflicts ? 'border-red-300 bg-red-50/80' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CalendarIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-lg font-semibold text-gray-900">
                          {format(parseISO(availability.date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                        <Users className="h-4 w-4 text-primary-600" />
                        <span className="font-medium">{availability.leader_name}</span>
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
                            <strong>
                              {availability.conflicting_events_count === 1
                                ? 'Existe 1 conflito'
                                : `${availability.conflicting_events_count} conflitos encontrados`}
                            </strong>
                            {' '}para este intervalo. Ajuste o horário ou libere o evento conflitante.
                            (Cálculo inclui buffer de 40 min antes/depois)
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {isOwner ? (
                        <>
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
                        </>
                      ) : (
                        <button
                          onClick={() => navigate('/eventos/novo', {
                            state: {
                              date: availability.date,
                              start_time: availability.start_time,
                              end_time: availability.end_time
                            }
                          })}
                          className="btn-primary flex items-center space-x-2"
                        >
                          <Plus className="h-5 w-5" />
                          <span>Propor Evento</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

                {/* Compartilhar */}
                <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_public)}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="flex items-center space-x-1">
                    <Share className="h-4 w-4 text-primary-600" />
                    <span>Compartilhar no meu perfil para convites</span>
                  </span>
                </label>

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
