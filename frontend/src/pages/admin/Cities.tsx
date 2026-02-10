import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Building2, Users, Plus, Edit2, Trash2, ChevronRight, Mail, Music2 } from 'lucide-react';
import {
  cityAdminService,
  type City,
  type CityStats,
  type CityCreate,
  type MusicianRequest,
} from '../../services/publicApi';
import { showToast } from '../../utils/toast';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';
import {
  AdminHero,
  AdminCard,
  AdminSearchBar,
  AdminTabs,
  AdminModal,
  AdminButton,
  AdminEmptyState,
  AdminLoading,
  AdminStatusBadge,
  AdminConfirmModal,
} from '../../components/admin';

const VALID_UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const statusColors: Record<City['status'], string> = {
  partner: 'border-emerald-500/30',
  expansion: 'border-blue-500/30',
  planning: 'border-white/10',
};

const statusBadgeMap: Record<City['status'], string> = {
  partner: 'approved',
  expansion: 'planned',
  planning: 'pending',
};

const nextStatus: Record<City['status'], City['status']> = {
  planning: 'expansion',
  expansion: 'partner',
  partner: 'planning',
};

const nextStatusLabel: Record<City['status'], string> = {
  planning: '→ Expansão',
  expansion: '→ Parceiro',
  partner: '→ Planejamento',
};

/* ─── City Card ─── */
const CityCard: React.FC<{
  city: City;
  onEdit: (city: City) => void;
  onDelete: (city: City) => void;
  onChangeStatus: (cityId: number, status: City['status']) => void;
}> = ({ city, onEdit, onDelete, onChangeStatus }) => (
  <div className={`admin-card p-4 border-2 ${statusColors[city.status]}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
      <div>
        <h3 className="font-semibold text-white">{city.name}, {city.state}</h3>
        <AdminStatusBadge status={statusBadgeMap[city.status]} label={city.status_display} />
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onEdit(city)}
          className="min-h-[44px] min-w-[44px] p-1.5 rounded hover:bg-white/10 transition-colors text-slate-300"
          title="Editar"
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(city)}
          className="min-h-[44px] min-w-[44px] p-1.5 rounded hover:bg-white/10 transition-colors text-red-400"
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>

    {city.description && (
      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{city.description}</p>
    )}

    <div className="flex items-center justify-between text-sm text-slate-300">
      <div className="flex gap-3">
        <span title="Músicos">
          <Users className="h-4 w-4 inline mr-1" />
          {city.musicians_count}
        </span>
        <span title="Solicitações">
          <Mail className="h-4 w-4 inline mr-1" />
          {city.requests_count}
        </span>
      </div>
      <button
        onClick={() => onChangeStatus(city.id, nextStatus[city.status])}
        className="min-h-[36px] text-xs font-medium px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
      >
        {nextStatusLabel[city.status]}
      </button>
    </div>
  </div>
);

/* ─── City Form ─── */
const CityForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CityCreate) => Promise<void>;
  editingCity: City | null;
}> = ({ isOpen, onClose, onSave, editingCity }) => {
  const [formData, setFormData] = useState<CityCreate>({
    name: '', state: '', status: 'planning', description: '', priority: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingCity) {
      setFormData({
        name: editingCity.name,
        state: editingCity.state,
        status: editingCity.status as CityCreate['status'],
        description: editingCity.description || '',
        priority: editingCity.priority || 0,
      });
    } else {
      setFormData({ name: '', state: '', status: 'planning', description: '', priority: 0 });
    }
    setFormErrors({});
  }, [editingCity, isOpen]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name || formData.name.trim().length < 2) errors.name = 'Nome deve ter no mínimo 2 caracteres';
    else if (formData.name.trim().length > 100) errors.name = 'Nome deve ter no máximo 100 caracteres';
    if (!formData.state || !VALID_UFS.includes(formData.state.toUpperCase())) errors.state = 'UF inválida';
    if (formData.description && formData.description.length > 500) errors.description = 'Máximo 500 caracteres';
    const priority = formData.priority ?? 0;
    if (priority < 0 || priority > 999) errors.priority = 'Prioridade deve ser entre 0 e 999';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch { /* handled by parent */ } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCity ? 'Editar Cidade' : 'Nova Cidade'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="admin-label">Nome da Cidade</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => { setFormData({ ...formData, name: e.target.value }); setFormErrors(prev => ({ ...prev, name: '' })); }}
            className={`admin-input ${formErrors.name ? 'border-red-500' : ''}`}
            placeholder="Ex: Monte Carmelo"
            required
          />
          {formErrors.name && <p className="text-sm text-red-400 mt-1">{formErrors.name}</p>}
        </div>

        <div>
          <label className="admin-label">Estado (UF)</label>
          <input
            type="text"
            value={formData.state}
            onChange={e => { setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) }); setFormErrors(prev => ({ ...prev, state: '' })); }}
            className={`admin-input ${formErrors.state ? 'border-red-500' : ''}`}
            placeholder="Ex: MG"
            maxLength={2}
            required
          />
          {formErrors.state && <p className="text-sm text-red-400 mt-1">{formErrors.state}</p>}
        </div>

        <div>
          <label className="admin-label">Status</label>
          <select
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as CityCreate['status'] })}
            className="admin-select"
          >
            <option value="planning">Em Planejamento</option>
            <option value="expansion">Em Expansão</option>
            <option value="partner">Parceiro</option>
          </select>
        </div>

        <div>
          <label className="admin-label">Descrição (opcional)</label>
          <textarea
            value={formData.description || ''}
            onChange={e => { setFormData({ ...formData, description: e.target.value }); setFormErrors(prev => ({ ...prev, description: '' })); }}
            className={`admin-textarea min-h-[96px] ${formErrors.description ? 'border-red-500' : ''}`}
            rows={3}
            placeholder="Notas sobre a cidade..."
          />
          {formErrors.description && <p className="text-sm text-red-400 mt-1">{formErrors.description}</p>}
          <p className="text-xs text-slate-500 mt-1">{formData.description?.length || 0}/500</p>
        </div>

        <div>
          <label className="admin-label">Prioridade</label>
          <input
            type="number"
            value={formData.priority}
            onChange={e => { setFormData({ ...formData, priority: parseInt(e.target.value) || 0 }); setFormErrors(prev => ({ ...prev, priority: '' })); }}
            className={`admin-input ${formErrors.priority ? 'border-red-500' : ''}`}
            min={0}
            max={999}
          />
          {formErrors.priority && <p className="text-sm text-red-400 mt-1">{formErrors.priority}</p>}
          <p className="text-xs text-slate-500 mt-1">Maior = mais importante (0-999)</p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <AdminButton variant="secondary" onClick={onClose}>
            Cancelar
          </AdminButton>
          <AdminButton variant="primary" type="submit" loading={submitting}>
            {editingCity ? 'Salvar' : 'Criar'}
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
};

/* ─── Main Component ─── */
const Cities: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state: stateParam, city: cityParam } = useParams();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'stats');
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [cityStatsLoading, setCityStatsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<{ city: string; state: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [cityRequests, setCityRequests] = useState<MusicianRequest[]>([]);
  const [cityInfo, setCityInfo] = useState<City | null>(null);
  const [cityFormOpen, setCityFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [cityToDelete, setCityToDelete] = useState<City | null>(null);

  const fetchExtendedStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      await cityAdminService.getExtendedStats(signal);
    } catch (error) {
      if (!signal?.aborted) showToast.apiError(error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const fetchCityStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setCityStatsLoading(true);
      const data = await cityAdminService.getRequestsByCity(signal);
      if (!signal?.aborted) setCityStats(data);
    } catch (error) {
      if (!signal?.aborted) showToast.apiError(error);
    } finally {
      if (!signal?.aborted) setCityStatsLoading(false);
    }
  }, []);

  const fetchCities = useCallback(async (signal?: AbortSignal) => {
    try {
      setCitiesLoading(true);
      const data = await cityAdminService.list(undefined, signal);
      if (!signal?.aborted) setCities(data);
    } catch (error) {
      if (!signal?.aborted) showToast.apiError(error);
    } finally {
      if (!signal?.aborted) setCitiesLoading(false);
    }
  }, []);

  const fetchCityDetail = useCallback(async (city: string, state: string, signal?: AbortSignal) => {
    try {
      setLoading(true);
      const data = await cityAdminService.getRequestsByCityDetail(city, state, signal);
      if (!signal?.aborted) {
        setCityRequests(data.requests);
        setCityInfo(data.city_info);
      }
    } catch (error) {
      if (!signal?.aborted) showToast.apiError(error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const loadTabData = async () => {
      await fetchExtendedStats(ac.signal);
      if (activeTab === 'stats') await fetchCityStats(ac.signal);
      else await fetchCities(ac.signal);
    };
    loadTabData();
    return () => { ac.abort(); };
  }, [activeTab, fetchCityStats, fetchCities, fetchExtendedStats]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (activeTab !== 'stats') params.tab = activeTab;
    if (searchTerm) params.q = searchTerm;
    setSearchParams(params, { replace: true });
  }, [activeTab, searchTerm, setSearchParams]);

  useEffect(() => {
    const ac = new AbortController();
    if (selectedCity) fetchCityDetail(selectedCity.city, selectedCity.state, ac.signal);
    return () => { ac.abort(); };
  }, [selectedCity, fetchCityDetail]);

  useEffect(() => {
    if (stateParam && cityParam) {
      setSelectedCity({ state: decodeURIComponent(stateParam), city: decodeURIComponent(cityParam) });
      if (activeTab !== 'stats') setActiveTab('stats');
      return;
    }
    setSelectedCity(null);
  }, [stateParam, cityParam, activeTab]);

  const handleSaveCity = async (data: CityCreate) => {
    try {
      if (editingCity) {
        await cityAdminService.update(editingCity.id, data);
        showToast.success('Cidade atualizada!');
      } else {
        await cityAdminService.create(data);
        showToast.success('Cidade criada!');
      }
      await fetchCities();
      await fetchExtendedStats();
      setEditingCity(null);
    } catch (error) {
      showToast.apiError(error);
      throw error;
    }
  };

  const handleChangeStatus = async (cityId: number, status: City['status']) => {
    try {
      await cityAdminService.changeStatus(cityId, status);
      showToast.success('Status alterado!');
      await fetchCities();
      await fetchExtendedStats();
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const handleDeleteCity = async () => {
    if (!cityToDelete) return;
    try {
      await cityAdminService.delete(cityToDelete.id);
      showToast.success('Cidade desativada!');
      setCityToDelete(null);
      await fetchCities();
      await fetchExtendedStats();
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const citiesByStatus = useMemo(() => ({
    partner: cities.filter(c => c.status === 'partner'),
    expansion: cities.filter(c => c.status === 'expansion'),
    planning: cities.filter(c => c.status === 'planning'),
  }), [cities]);

  const tabs = [
    { key: 'stats', label: 'Por Cidade' },
    { key: 'management', label: 'Gerenciar Cidades' },
  ];

  return (
    <div className="space-y-6">
      <AdminHero
        title="Gestão de Cidades"
        description="Gerencie cidades e visualize solicitações por região"
      />

      <AdminTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ─── Stats Tab ─── */}
      {activeTab === 'stats' && (
        <>
          {selectedCity ? (
            <>
              <button
                onClick={() => {
                  const query = searchParams.toString();
                  navigate({ pathname: ADMIN_ROUTES.cities, search: query ? `?${query}` : '' });
                }}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Voltar para lista de cidades
              </button>

              <AdminCard>
                <h2 className="text-xl font-bold text-white">
                  {selectedCity.city}, {selectedCity.state}
                </h2>
                {cityInfo && (
                  <AdminStatusBadge
                    status={statusBadgeMap[cityInfo.status]}
                    label={cityInfo.status_display}
                  />
                )}
              </AdminCard>

              <AdminCard>
                <AdminSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar por nome, email ou instrumento"
                />
              </AdminCard>

              {loading ? (
                <AdminLoading count={3} />
              ) : cityRequests.length === 0 ? (
                <AdminEmptyState title="Nenhuma solicitação encontrada" />
              ) : (
                <div className="grid gap-4">
                  {cityRequests.map(request => (
                    <AdminCard key={request.id}>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-lg font-semibold text-white">{request.full_name}</span>
                          <AdminStatusBadge status={request.status} label={request.status_display} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-400">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" /> {request.email}
                          </span>
                          <span className="flex items-center gap-2">
                            <Music2 className="h-4 w-4" /> {request.instrument}
                          </span>
                        </div>
                      </div>
                    </AdminCard>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {cityStatsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="admin-card p-4 animate-pulse">
                      <div className="h-5 bg-slate-700 rounded w-2/3 mb-3"></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-4 bg-slate-700 rounded"></div>
                        <div className="h-4 bg-slate-700 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : cityStats.length === 0 ? (
                <AdminEmptyState
                  icon={MapPin}
                  title="Nenhuma cidade com solicitações"
                  description="Quando músicos solicitarem acesso, as cidades aparecerão aqui."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cityStats.map(cs => (
                    <AdminCard
                      key={`${cs.city}-${cs.state}`}
                      hover
                      onClick={() => {
                        const query = searchParams.toString();
                        navigate({
                          pathname: ADMIN_ROUTES.citiesDetail(cs.state, cs.city),
                          search: query ? `?${query}` : '',
                        });
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-white">{cs.city}, {cs.state}</h3>
                          {cs.city_obj && (
                            <AdminStatusBadge
                              status={statusBadgeMap[cs.city_obj.status]}
                              label={cs.city_obj.status_display}
                            />
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><p className="text-slate-500">Total</p><p className="font-semibold text-white">{cs.total_requests}</p></div>
                        <div><p className="text-slate-500">Pendentes</p><p className="font-semibold text-amber-400">{cs.pending_requests}</p></div>
                        <div><p className="text-slate-500">Aprovados</p><p className="font-semibold text-emerald-400">{cs.approved_requests}</p></div>
                        <div><p className="text-slate-500">Músicos</p><p className="font-semibold text-blue-400">{cs.active_musicians}</p></div>
                      </div>
                    </AdminCard>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── Management Tab ─── */}
      {activeTab === 'management' && (
        <>
          <div className="flex justify-end">
            <AdminButton variant="primary" icon={Plus} onClick={() => { setEditingCity(null); setCityFormOpen(true); }}>
              Nova Cidade
            </AdminButton>
          </div>

          {citiesLoading ? (
            <AdminLoading count={3} />
          ) : cities.length === 0 ? (
            <AdminEmptyState
              icon={Building2}
              title="Nenhuma cidade cadastrada"
              description="Cadastre cidades para organizar a expansão da plataforma."
              action={{ label: 'Cadastrar Cidade', onClick: () => { setEditingCity(null); setCityFormOpen(true); } }}
            />
          ) : (
            <div className="space-y-8">
              {(['partner', 'expansion', 'planning'] as const).map(status => {
                const group = citiesByStatus[status];
                if (group.length === 0) return null;
                const labels: Record<string, string> = { partner: 'Parceiras', expansion: 'Em Expansão', planning: 'Em Planejamento' };
                return (
                  <div key={status}>
                    <h3 className="text-lg font-semibold text-white mb-3">{labels[status]}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.map(city => (
                        <CityCard
                          key={city.id}
                          city={city}
                          onEdit={c => { setEditingCity(c); setCityFormOpen(true); }}
                          onDelete={c => setCityToDelete(c)}
                          onChangeStatus={handleChangeStatus}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* City Form Modal */}
      <CityForm
        isOpen={cityFormOpen}
        onClose={() => { setCityFormOpen(false); setEditingCity(null); }}
        onSave={handleSaveCity}
        editingCity={editingCity}
      />

      {/* Delete Confirmation */}
      <AdminConfirmModal
        isOpen={!!cityToDelete}
        onClose={() => setCityToDelete(null)}
        onConfirm={handleDeleteCity}
        title="Desativar Cidade"
        message={`Deseja realmente desativar ${cityToDelete?.name}, ${cityToDelete?.state}?`}
        confirmLabel="Desativar"
        variant="danger"
      />
    </div>
  );
};

export default Cities;
