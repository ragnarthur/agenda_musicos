import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin,
  Building2,
  Users,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Search,
  Mail,
  Music2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  cityAdminService,
  type City,
  type CityStats,
  type CityCreate,
  type DashboardStatsExtended,
  type MusicianRequest,
} from '../../services/publicApi';
import { showToast } from '../../utils/toast';

const VALID_UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

const Cities: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'management'>('stats');
  const [extendedStats, setExtendedStats] = useState<DashboardStatsExtended | null>(null);
  void extendedStats;
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [cityStatsLoading, setCityStatsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<{ city: string; state: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityRequests, setCityRequests] = useState<MusicianRequest[]>([]);
  const [cityInfo, setCityInfo] = useState<City | null>(null);
  const [cityFormOpen, setCityFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [formData, setFormData] = useState<CityCreate>({
    name: '',
    state: '',
    status: 'planning',
    description: '',
    priority: 0,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchExtendedStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const data = await cityAdminService.getExtendedStats(signal);
      if (!signal?.aborted) {
        setExtendedStats(data);
      }
    } catch (error) {
      if (!signal?.aborted) {
        showToast.apiError(error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const fetchCityStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setCityStatsLoading(true);
      const data = await cityAdminService.getRequestsByCity(signal);
      if (!signal?.aborted) {
        setCityStats(data);
      }
    } catch (error) {
      if (!signal?.aborted) {
        showToast.apiError(error);
      }
    } finally {
      if (!signal?.aborted) {
        setCityStatsLoading(false);
      }
    }
  }, []);

  const fetchCities = useCallback(async (signal?: AbortSignal) => {
    try {
      setCitiesLoading(true);
      const data = await cityAdminService.list(undefined, signal);
      if (!signal?.aborted) {
        setCities(data);
      }
    } catch (error) {
      if (!signal?.aborted) {
        showToast.apiError(error);
      }
    } finally {
      if (!signal?.aborted) {
        setCitiesLoading(false);
      }
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
      if (!signal?.aborted) {
        showToast.apiError(error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    fetchExtendedStats(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [fetchExtendedStats]);

  useEffect(() => {
    const abortController = new AbortController();
    if (activeTab === 'stats') {
      fetchCityStats(abortController.signal);
    } else {
      fetchCities(abortController.signal);
    }
    return () => {
      abortController.abort();
    };
  }, [activeTab, fetchCityStats, fetchCities]);

  useEffect(() => {
    const abortController = new AbortController();
    if (selectedCity) {
      fetchCityDetail(selectedCity.city, selectedCity.state, abortController.signal);
    }
    return () => {
      abortController.abort();
    };
  }, [selectedCity, fetchCityDetail]);

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
      setCityFormOpen(false);
      setEditingCity(null);
    } catch (error) {
      showToast.apiError(error);
      throw error;
    }
  };

  const handleChangeStatus = async (
    cityId: number,
    status: 'partner' | 'expansion' | 'planning'
  ) => {
    try {
      await cityAdminService.changeStatus(cityId, status);
      showToast.success('Status alterado!');
      await fetchCities();
      await fetchExtendedStats();
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const handleDeleteCity = async (cityId: number) => {
    if (!confirm('Deseja realmente desativar esta cidade?')) return;
    try {
      await cityAdminService.delete(cityId);
      showToast.success('Cidade desativada!');
      await fetchCities();
      await fetchExtendedStats();
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Nome da cidade deve ter no mínimo 2 caracteres';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Nome da cidade deve ter no máximo 100 caracteres';
    }

    if (!formData.state || formData.state.trim() === '') {
      errors.state = 'Estado é obrigatório';
    } else if (!VALID_UFS.includes(formData.state.toUpperCase())) {
      errors.state = 'Estado inválido. Use uma UF brasileira válida';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Descrição deve ter no máximo 500 caracteres';
    }

    const priorityValue = formData.priority ?? 0;
    if (priorityValue < 0) {
      errors.priority = 'Prioridade deve ser no mínimo 0';
    } else if (priorityValue > 999) {
      errors.priority = 'Prioridade deve ser no máximo 999';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting) return;
    if (!validateForm()) {
      return;
    }
    setFormSubmitting(true);
    try {
      await handleSaveCity(formData);
      setFormData({ name: '', state: '', status: 'planning', description: '', priority: 0 });
      setFormErrors({});
      setCityFormOpen(false);
      setEditingCity(null);
    } catch {
      // Error already handled
    } finally {
      setFormSubmitting(false);
    }
  };

  const citiesByStatus = useMemo(() => {
    return {
      partner: cities.filter(c => c.status === 'partner'),
      expansion: cities.filter(c => c.status === 'expansion'),
      planning: cities.filter(c => c.status === 'planning'),
    };
  }, [cities]);

  const statusColors: Record<City['status'], string> = {
    partner: 'bg-green-100 text-green-800 border-green-200',
    expansion: 'bg-blue-100 text-blue-800 border-blue-200',
    planning: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const nextStatus: Record<City['status'], City['status']> = {
    planning: 'expansion',
    expansion: 'partner',
    partner: 'planning',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestão de Cidades</h1>
        <p className="text-gray-600">Gerencie cidades e visualize solicitações por região</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow p-1 inline-flex">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'stats'
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Por Cidade
        </button>
        <button
          onClick={() => setActiveTab('management')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'management'
              ? 'bg-amber-100 text-amber-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Gerenciar Cidades
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <>
          {selectedCity ? (
            <>
              <button
                onClick={() => setSelectedCity(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Voltar para lista de cidades
              </button>

              <div className="bg-white rounded-xl shadow p-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedCity.city}, {selectedCity.state}
                </h2>
                {cityInfo && (
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      cityInfo.status === 'partner'
                        ? 'bg-green-100 text-green-800'
                        : cityInfo.status === 'expansion'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {cityInfo.status_display}
                  </span>
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-4 mb-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nome, email ou instrumento"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl shadow p-5 animate-pulse">
                      <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : cityRequests.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-10 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma solicitação encontrada
                  </h3>
                </div>
              ) : (
                <div className="grid gap-4">
                  {cityRequests.map(request => (
                    <div key={request.id} className="bg-white rounded-xl shadow p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-gray-900">
                            {request.full_name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium">
                            {getStatusIcon(request.status)}
                            {request.status_display}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {request.email}
                          </span>
                          <span className="flex items-center gap-2">
                            <Music2 className="h-4 w-4" />
                            {request.instrument}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {cityStatsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-xl shadow p-4 animate-pulse">
                      <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : cityStats.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-10 text-center">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma cidade com solicitações
                  </h3>
                  <p className="text-gray-600">
                    Quando músicos solicitarem acesso, as cidades aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cityStats.map(cs => (
                    <button
                      key={`${cs.city}-${cs.state}`}
                      onClick={() => setSelectedCity({ city: cs.city, state: cs.state })}
                      className="bg-white rounded-xl shadow p-4 text-left hover:shadow-md transition-shadow w-full"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {cs.city}, {cs.state}
                          </h3>
                          {cs.city_obj && (
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[cs.city_obj.status] || 'bg-gray-100 text-gray-800'}`}
                            >
                              {cs.city_obj.status_display}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Total</p>
                          <p className="font-semibold text-gray-900">{cs.total_requests}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Pendentes</p>
                          <p className="font-semibold text-yellow-600">{cs.pending_requests}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Aprovados</p>
                          <p className="font-semibold text-green-600">{cs.approved_requests}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Músicos</p>
                          <p className="font-semibold text-blue-600">{cs.active_musicians}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Management Tab */}
      {activeTab === 'management' && (
        <>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => {
                setEditingCity(null);
                setCityFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" />
              Nova Cidade
            </button>
          </div>

          {citiesLoading ? (
            <div className="space-y-8">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2].map(j => (
                      <div key={j} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : cities.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma cidade cadastrada</h3>
              <p className="text-gray-600 mb-4">
                Cadastre cidades para organizar a expansão da plataforma.
              </p>
              <button
                onClick={() => {
                  setEditingCity(null);
                  setCityFormOpen(true);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Cadastrar Cidade
              </button>
            </div>
          ) : (
            <>
              {citiesByStatus.partner.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Parceiras</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {citiesByStatus.partner.map(city => (
                      <div
                        key={city.id}
                        className={`rounded-xl border-2 p-4 ${statusColors[city.status]}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {city.name}, {city.state}
                            </h3>
                            <span className="text-xs font-medium">{city.status_display}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingCity(city);
                                setCityFormOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-white/50 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCity(city.id)}
                              className="p-1.5 rounded hover:bg-white/50 transition-colors text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {city.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {city.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-sm">
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
                            onClick={() => handleChangeStatus(city.id, nextStatus[city.status])}
                            className="text-xs font-medium px-2 py-1 rounded bg-white/50 hover:bg-white/80 transition-colors"
                          >
                            → Planejamento
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {citiesByStatus.expansion.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Em Expansão</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {citiesByStatus.expansion.map(city => (
                      <div
                        key={city.id}
                        className={`rounded-xl border-2 p-4 ${statusColors[city.status]}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {city.name}, {city.state}
                            </h3>
                            <span className="text-xs font-medium">{city.status_display}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingCity(city);
                                setCityFormOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-white/50 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCity(city.id)}
                              className="p-1.5 rounded hover:bg-white/50 transition-colors text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {city.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {city.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-sm">
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
                            onClick={() => handleChangeStatus(city.id, nextStatus[city.status])}
                            className="text-xs font-medium px-2 py-1 rounded bg-white/50 hover:bg-white/80 transition-colors"
                          >
                            → Parceiro
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {citiesByStatus.planning.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Em Planejamento</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {citiesByStatus.planning.map(city => (
                      <div
                        key={city.id}
                        className={`rounded-xl border-2 p-4 ${statusColors[city.status]}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {city.name}, {city.state}
                            </h3>
                            <span className="text-xs font-medium">{city.status_display}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingCity(city);
                                setCityFormOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-white/50 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCity(city.id)}
                              className="p-1.5 rounded hover:bg-white/50 transition-colors text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {city.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {city.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-sm">
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
                            onClick={() => handleChangeStatus(city.id, nextStatus[city.status])}
                            className="text-xs font-medium px-2 py-1 rounded bg-white/50 hover:bg-white/80 transition-colors"
                          >
                            → Expansão
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* City Form Modal */}
      {cityFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCity ? 'Editar Cidade' : 'Nova Cidade'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Cidade
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: '' });
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40 ${
                    formErrors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Ex: Monte Carmelo"
                  required
                />
                {formErrors.name && <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={e => {
                    setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) });
                    if (formErrors.state) {
                      setFormErrors({ ...formErrors, state: '' });
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40 ${
                    formErrors.state ? 'border-red-500 focus:border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Ex: MG"
                  maxLength={2}
                  required
                />
                {formErrors.state && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.state}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e =>
                    setFormData({ ...formData, status: e.target.value as CityCreate['status'] })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40"
                >
                  <option value="planning">Em Planejamento</option>
                  <option value="expansion">Em Expansão</option>
                  <option value="partner">Parceiro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => {
                    setFormData({ ...formData, description: e.target.value });
                    if (formErrors.description) {
                      setFormErrors({ ...formErrors, description: '' });
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40 ${
                    formErrors.description
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-200'
                  }`}
                  rows={3}
                  placeholder="Notas sobre a cidade..."
                />
                {formErrors.description && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description?.length || 0}/500 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={e => {
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 });
                    if (formErrors.priority) {
                      setFormErrors({ ...formErrors, priority: '' });
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/40 ${
                    formErrors.priority ? 'border-red-500 focus:border-red-500' : 'border-gray-200'
                  }`}
                  min={0}
                  max={999}
                />
                {formErrors.priority && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.priority}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Maior = mais importante (0-999)</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCityFormOpen(false);
                    setEditingCity(null);
                    setFormData({
                      name: '',
                      state: '',
                      status: 'planning',
                      description: '',
                      priority: 0,
                    });
                    setFormErrors({});
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formSubmitting ? 'Salvando...' : editingCity ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cities;
