// pages/LeaderAvailability.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Info,
  Users,
  Search,
  Share,
  Music,
} from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import ConfirmModal from '../components/modals/ConfirmModal';
import { leaderAvailabilityService, musicianService, type InstrumentOption } from '../services/api';
import { getErrorMessage, showToast } from '../utils/toast';
import type { LeaderAvailability, LeaderAvailabilityCreate } from '../types';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { logError } from '../utils/logger';
import { sanitizeOptionalText } from '../utils/sanitize';

const LeaderAvailabilityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [availabilities, setAvailabilities] = useState<LeaderAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [instruments, setInstruments] = useState<InstrumentOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [showShared, setShowShared] = useState(false);
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [pendingDelete, setPendingDelete] = useState<LeaderAvailability | null>(null);

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
      // Backend can occasionally return duplicated rows; keep UI stable by de-duping by id.
      const unique = Array.from(new Map((data || []).map(a => [a.id, a])).values()).sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.start_time !== b.start_time) return a.start_time < b.start_time ? -1 : 1;
        return a.id - b.id;
      });
      setAvailabilities(unique);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, searchTerm, showShared, instrumentFilter]);

  // Carrega lista de instrumentos cadastrados
  const loadInstruments = useCallback(async () => {
    try {
      const data = await musicianService.getInstruments();
      setInstruments(data);
    } catch (error) {
      logError('Erro ao carregar instrumentos:', error);
      showToast.apiError(error);
    }
  }, []);

  useEffect(() => {
    loadAvailabilities();
  }, [loadAvailabilities]);

  useEffect(() => {
    loadInstruments();
  }, [loadInstruments]);

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
      const parseLocalDate = (value: string) => {
        if (!value) return null;
        const [year, month, day] = value.split('-').map(Number);
        if (!year || !month || !day) return null;
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
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
      const availDate = parseLocalDate(formData.date);

      if (!availDate) {
        setError('Data inválida');
        setActionLoading(false);
        return;
      }

      if (availDate < today) {
        setError('A data não pode ser no passado');
        setActionLoading(false);
        return;
      }

      if (editingId) {
        const payload: LeaderAvailabilityCreate = {
          ...formData,
          notes: sanitizeOptionalText(formData.notes, 1000),
        };
        await leaderAvailabilityService.update(editingId, payload);
        showToast.success('Disponibilidade atualizada!');
      } else {
        const payload: LeaderAvailabilityCreate = {
          ...formData,
          notes: sanitizeOptionalText(formData.notes, 1000),
        };
        await leaderAvailabilityService.create(payload);
        showToast.availabilityCreated();
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      await loadAvailabilities();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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

  const handleDelete = (availability: LeaderAvailability) => {
    setPendingDelete(availability);
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

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setActionLoading(true);
      await leaderAvailabilityService.delete(pendingDelete.id);
      showToast.availabilityDeleted();
      setPendingDelete(null);
      await loadAvailabilities();
    } catch (error: unknown) {
      showToast.apiError(error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-shell py-6 sm:py-8 page-stack">
        {/* Header */}
        <div className="hero-panel">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_40%)]" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Disponibilidades compartilhadas
              </h1>
              <p className="text-gray-600 dark:text-slate-300 max-w-2xl text-sm sm:text-base">
                Cadastre horários disponíveis, defina visibilidade e receba convites com controle de
                conflitos. O sistema respeita 40 minutos de buffer entre apresentações.
              </p>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ideal para formações variadas e agendas dinâmicas</span>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2 shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>Nova disponibilidade</span>
            </button>
          </div>
        </div>

        {/* Info sobre buffer de 40 minutos */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/90 dark:bg-slate-900/40 dark:border-white/10 backdrop-blur p-4 shadow-lg">
          <div className="spotlight pointer-events-none absolute inset-0 -z-10" />
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-primary-800 dark:text-primary-200">
              <p className="font-medium mb-1 text-primary-900 dark:text-primary-100">
                Buffer automático de 40 minutos
              </p>
              <p>
                Bloqueamos 40 minutos antes/depois de cada apresentação para deslocamento e
                preparação. Isso evita conflitos e mantém sua agenda realista.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs: Minhas Datas vs Explorar Músicos */}
        <div className="flex flex-col gap-4">
          {/* Tabs principais */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setShowShared(false)}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-all touch-manipulation whitespace-nowrap min-h-[44px] ${
                !showShared
                  ? 'border-indigo-500 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200/60'
                  : 'border-white/60 bg-white/80 text-gray-700 hover:bg-white hover:border-indigo-200 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/60'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Minhas Datas</span>
            </button>
            <button
              onClick={() => setShowShared(true)}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-all touch-manipulation whitespace-nowrap min-h-[44px] ${
                showShared
                  ? 'border-indigo-500 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200/60'
                  : 'border-white/60 bg-white/80 text-gray-700 hover:bg-white hover:border-indigo-200 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/60'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Explorar Músicos</span>
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {[
                { value: 'upcoming', label: 'Próximas' },
                { value: 'all', label: 'Todas' },
                { value: 'past', label: 'Passadas' },
              ].map(item => (
                <button
                  key={item.value}
                  onClick={() => setTimeFilter(item.value as 'upcoming' | 'past' | 'all')}
                  className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-all touch-manipulation whitespace-nowrap min-h-[44px] ${
                    timeFilter === item.value
                      ? 'border-indigo-500 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200/60'
                      : 'border-white/60 bg-white/80 text-gray-700 hover:bg-white hover:border-indigo-200 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Filtros de busca - visíveis apenas em "Explorar Músicos" */}
            {showShared && (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    className="min-h-[44px] w-full md:w-auto pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 bg-white/85 text-slate-900 placeholder:text-slate-400 border-white/60 shadow-sm dark:bg-slate-900/50 dark:text-slate-100 dark:border-white/10"
                    placeholder="Buscar músico (ex: Bruno)"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Music className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                  <select
                    className="min-h-[44px] border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 w-full md:w-auto bg-white/85 text-slate-900 border-white/60 shadow-sm dark:bg-slate-900/50 dark:text-slate-100 dark:border-white/10"
                    value={instrumentFilter}
                    onChange={e => setInstrumentFilter(e.target.value)}
                    aria-label="Filtrar por instrumento"
                  >
                    <option value="all">Todos os instrumentos</option>
                    {instruments.map(inst => (
                      <option key={inst.value} value={inst.value}>
                        {inst.label} ({inst.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
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
            {availabilities.map(availability => {
              const isOwner = availability.leader === user?.id;
              return (
                <div
                  key={availability.id}
                  className={`card-contrast relative ${
                    availability.has_conflicts
                      ? 'border-amber-200/70 bg-amber-50/60 dark:border-amber-700/40 dark:bg-amber-950/10'
                      : ''
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-slate-400" />
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {format(parseISO(availability.date), 'dd/MM/yyyy')}
                        </span>
                        {availability.has_conflicts && (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200">
                            Conflito
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-slate-300 mb-1">
                        <Users className="h-4 w-4 text-primary-600" />
                        <span className="font-medium">{availability.leader_name}</span>
                        {availability.leader_instrument_display && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-primary-200 bg-primary-50/80 text-primary-800 dark:border-primary-800/40 dark:bg-primary-900/25 dark:text-primary-200">
                            <Music className="h-3 w-3 mr-1" />
                            {availability.leader_instrument_display}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 mb-2">
                        <Clock className="h-5 w-5 text-gray-500 dark:text-slate-400" />
                        <span className="text-gray-700 dark:text-slate-200">
                          {availability.start_time.slice(0, 5)} -{' '}
                          {availability.end_time.slice(0, 5)}
                        </span>
                      </div>
                      {availability.notes && (
                        <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">
                          {availability.notes}
                        </p>
                      )}
                      {availability.has_conflicts && (
                        <div className="flex items-start space-x-2 mt-3 rounded-xl border border-amber-200/70 bg-amber-50/80 p-3 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-100">
                          <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-200 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-900 dark:text-amber-100">
                            <strong>
                              {availability.conflicting_events_count === 1
                                ? 'Existe 1 conflito'
                                : `${availability.conflicting_events_count} conflitos encontrados`}
                            </strong>{' '}
                            para este intervalo. Isso não é um erro: indica que já existe um evento
                            no horário (considerando o buffer de 40 min). Ajuste o horário ou
                            reorganize o evento conflitante.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 sm:ml-4">
                      {isOwner ? (
                        <>
                          <button
                            onClick={() => handleEdit(availability)}
                            aria-label="Editar disponibilidade"
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/50 bg-white/70 text-indigo-700 shadow-sm backdrop-blur transition-all touch-manipulation active:scale-[0.99] hover:bg-white dark:border-white/10 dark:bg-slate-900/50 dark:text-indigo-200 dark:hover:bg-slate-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                            title="Editar"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(availability)}
                            aria-label="Remover disponibilidade"
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/50 bg-white/70 text-rose-700 shadow-sm backdrop-blur transition-all touch-manipulation active:scale-[0.99] hover:bg-rose-50/70 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/50 dark:text-rose-200 dark:hover:bg-rose-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                            title="Deletar"
                            disabled={actionLoading}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            navigate('/eventos/novo', {
                              state: {
                                date: availability.date,
                                start_time: availability.start_time,
                                end_time: availability.end_time,
                              },
                            })
                          }
                          className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2"
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

        <ConfirmModal
          isOpen={Boolean(pendingDelete)}
          onClose={() => {
            if (actionLoading) return;
            setPendingDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Remover disponibilidade"
          message="Tem certeza que deseja remover esta disponibilidade?"
          confirmText="Remover"
          confirmVariant="danger"
          loading={actionLoading}
          icon={<Trash2 className="h-5 w-5" />}
        />

        {/* Modal de criar/editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl max-w-md w-full p-6 border border-white/50 bg-white/95 text-gray-900 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
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
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>

                {/* Horários */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="start_time"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Início *
                    </label>
                    <input
                      id="start_time"
                      name="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="end_time"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Término *
                    </label>
                    <input
                      id="end_time"
                      name="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
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
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
                    onChange={e => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
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
