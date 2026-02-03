// pages/company/MusicianSearch.tsx
// Página de busca e descoberta de músicos para empresas
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Filter, X } from 'lucide-react';
import { useCompanyAuth } from '../../contexts/CompanyAuthContext';
import CompanyNavbar from '../../components/navigation/CompanyNavbar';
import { publicMusicianService, type MusicianPublic } from '../../services/publicApi';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import { BRAZILIAN_STATES } from '../../config/locations';
import { clearLocationPreference, getLocationPreference } from '../../utils/locationPreference';

const COMMON_INSTRUMENTS = [
  'Violão',
  'Guitarra',
  'Baixo',
  'Bateria',
  'Teclado',
  'Piano',
  'Saxofone',
  'Trompete',
  'Violino',
  'Flauta',
  'Canto',
  'DJ',
];

const MusicianSearch: React.FC = () => {
  const { organization, loading: authLoading } = useCompanyAuth();

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating');

  // Estados de dados
  const [musicians, setMusicians] = useState<MusicianPublic[]>([]);
  const [filteredMusicians, setFilteredMusicians] = useState<MusicianPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Inicializar com cidade preferida (manual) ou cidade da empresa
  useEffect(() => {
    const preference = getLocationPreference();
    if (preference?.city && preference?.state) {
      setSelectedCity(preference.city);
      setSelectedState(preference.state);
      return;
    }

    if (organization?.city && organization?.state) {
      setSelectedCity(organization.city);
      setSelectedState(organization.state);
    }
  }, [organization]);

  useEffect(() => {
    const onPreferenceUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail as { city?: string; state?: string };
      if (detail?.city && detail?.state) {
        setSelectedCity(detail.city);
        setSelectedState(detail.state);
      }
    };

    const onPreferenceCleared = () => {
      if (organization?.city && organization?.state) {
        setSelectedCity(organization.city);
        setSelectedState(organization.state);
      } else {
        setSelectedCity('');
        setSelectedState('');
      }
    };

    window.addEventListener('location:preference-updated', onPreferenceUpdated);
    window.addEventListener('location:preference-cleared', onPreferenceCleared);
    return () => {
      window.removeEventListener('location:preference-updated', onPreferenceUpdated);
      window.removeEventListener('location:preference-cleared', onPreferenceCleared);
    };
  }, [organization]);

  // Aplicar filtros e ordenação
  useEffect(() => {
    let filtered = [...musicians];

    // Filtro por termo de busca (nome ou instrumento)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        m =>
          m.full_name.toLowerCase().includes(term) ||
          m.instrument?.toLowerCase().includes(term) ||
          m.instruments?.some(i => i.toLowerCase().includes(term))
      );
    }

    // Filtro por instrumento específico
    if (selectedInstrument) {
      filtered = filtered.filter(
        m => m.instrument === selectedInstrument || m.instruments?.includes(selectedInstrument)
      );
    }

    // Ordenação
    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }

    setFilteredMusicians(filtered);
  }, [musicians, searchTerm, selectedInstrument, sortBy]);

  const loadMusicians = useCallback(async () => {
    try {
      setLoading(true);
      const data = await publicMusicianService.listByCity(selectedCity, selectedState);
      setMusicians(data);
    } catch (error: unknown) {
      console.error('Erro ao carregar músicos:', error);
      toast.error('Erro ao carregar músicos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedState]);

  // Carregar músicos quando cidade/estado mudar
  useEffect(() => {
    if (selectedCity && selectedState) {
      loadMusicians();
    }
  }, [loadMusicians, selectedCity, selectedState]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedInstrument('');
    setSortBy('rating');
    if (organization?.city && organization?.state) {
      setSelectedCity(organization.city);
      setSelectedState(organization.state);
    }
  };

  const hasActiveFilters =
    searchTerm ||
    selectedInstrument ||
    (organization?.city && selectedCity !== organization.city) ||
    (organization?.state && selectedState !== organization.state);

  if (authLoading) {
    return (
      <div className="min-h-[100svh] bg-gray-50 flex items-center justify-center">
        <Loading text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-gray-50">
      <CompanyNavbar />

      <div className="page-shell max-w-7xl py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Buscar Músicos</h1>
          <p className="text-gray-600">Encontre os profissionais perfeitos para seu evento</p>
        </div>

        {/* Barra de Busca e Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Campo de busca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou instrumento..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                />
              </div>
            </div>

            {/* Botão de filtros mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 sm:py-2 bg-gray-100 rounded-lg hover:bg-gray-200 min-h-[44px]"
            >
              <Filter className="h-5 w-5" />
              Filtros
            </button>
          </div>

          {/* Filtros (desktop sempre visível, mobile toggle) */}
          <div
            className={`${showFilters ? 'block' : 'hidden'} lg:block mt-4 pt-4 border-t border-gray-200`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Cidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  placeholder="Ex: Monte Carmelo"
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={selectedState}
                  onChange={e => setSelectedState(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                >
                  <option value="">Selecione...</option>
                  {BRAZILIAN_STATES.map(state => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instrumento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instrumento</label>
                <select
                  value={selectedInstrument}
                  onChange={e => setSelectedInstrument(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                >
                  <option value="">Todos</option>
                  {COMMON_INSTRUMENTS.map(instrument => (
                    <option key={instrument} value={instrument}>
                      {instrument}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ordenação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'rating' | 'name')}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[44px]"
                >
                  <option value="rating">Avaliação</option>
                  <option value="name">Nome</option>
                </select>
              </div>
            </div>

            {/* Botão limpar filtros */}
            {hasActiveFilters && (
              <div className="mt-4">
                <button
                  onClick={clearFilters}
                  className="min-h-[44px] inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <X className="h-4 w-4" />
                  Limpar filtros
                </button>
              </div>
            )}

            {(selectedCity || selectedState) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <MapPin className="h-4 w-4 text-indigo-500" />
                <span>
                  Buscando em {selectedCity || 'cidade'}
                  {selectedState ? `, ${selectedState}` : ''}
                </span>
                <button
                  type="button"
                  onClick={clearLocationPreference}
                  className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                >
                  Usar cidade da empresa
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading text="Buscando músicos..." />
          </div>
        ) : filteredMusicians.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum músico encontrado</h3>
            <p className="text-gray-600 mb-6">Tente ajustar os filtros ou buscar em outra cidade</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="min-h-[44px] px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {filteredMusicians.length} músico{filteredMusicians.length !== 1 ? 's' : ''}{' '}
              encontrado{filteredMusicians.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMusicians.map(musician => (
                <motion.div
                  key={musician.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Avatar/Cover */}
                  <div className="h-48 bg-gradient-to-br from-indigo-400 to-purple-500 relative">
                    {musician.cover_image_url ? (
                      <img
                        src={musician.cover_image_url}
                        alt={musician.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-white text-6xl font-bold">
                          {musician.full_name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}

                    {/* Avatar sobreposto */}
                    <div className="absolute -bottom-8 left-6">
                      {musician.avatar_url ? (
                        <img
                          src={musician.avatar_url}
                          alt={musician.full_name}
                          className="w-16 h-16 rounded-full border-4 border-white"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full border-4 border-white bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                          {musician.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="pt-10 px-6 pb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{musician.full_name}</h3>
                    <p className="text-indigo-600 font-medium mb-2">{musician.instrument}</p>

                    {/* Localização */}
                    {musician.city && musician.state && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                        <MapPin className="h-4 w-4" />
                        {musician.city}, {musician.state}
                      </div>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">
                          {musician.average_rating?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        ({musician.total_ratings || 0} avaliação
                        {musician.total_ratings !== 1 ? 'ões' : ''})
                      </span>
                    </div>

                    {/* Bio */}
                    {musician.bio && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{musician.bio}</p>
                    )}

                    {/* Botão Ver Perfil */}
                    <Link
                      to={`/empresa/musicians/${musician.id}`}
                      className="block min-h-[44px] w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Ver Perfil
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MusicianSearch;
