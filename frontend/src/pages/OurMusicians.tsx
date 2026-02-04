// pages/OurMusicians.tsx
// Catálogo público global de músicos
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Music,
  Star,
  Users,
  Filter,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { allMusiciansService, type MusicianPublic } from '../services/publicApi';
import { BRAZILIAN_STATES } from '../config/cities';

export default function OurMusicians() {
  const navigate = useNavigate();
  const [musicians, setMusicians] = useState<MusicianPublic[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [instrument, setInstrument] = useState('');
  const [minRating, setMinRating] = useState('');
  
  // UI
  const [showFilters, setShowFilters] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    loadMusicians();
  }, [search, city, state, instrument, minRating]);

  const loadMusicians = async () => {
    setLoading(true);
    try {
      const data = await allMusiciansService.list(params);
      setMusicians(data);
    } catch (error) {
      console.error('Erro ao carregar músicos:', error);
    } finally {
      setLoading(false);
    }
  };
      setMusicians(data);
    } catch (error) {
      console.error('Erro ao carregar músicos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMusicians = async () => {
    setLoading(true);
    try {
      const params: any = {
        search: search || undefined,
        city: city || undefined,
        state: state || undefined,
        instrument: instrument || undefined,
        min_rating: minRating || undefined,
        limit: 100,
      };
      
      const data = await allMusiciansService.list(params);
      setMusicians(data);
    } catch (error) {
      console.error('Erro ao carregar músicos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestQuote = (musicianId: number) => {
    navigate(`/musicos/${musicianId}`);
  };

  const getInstrumentIcon = (instrument: string) => {
    return <Music className="w-5 h-5" />;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
              Nossos Músicos
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Encontre os melhores músicos profissionais para seu evento
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-white font-medium mb-4"
          >
            <Filter className="w-5 h-5" />
            Filtros
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Busca sempre visível */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por nome ou instrumento..."
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Filtros avançados */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Estado
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                  <option value="">Todos</option>
                  {BRAZILIAN_STATES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Digite a cidade..."
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Instrumento
                </label>
                <input
                  type="text"
                  value={instrument}
                  onChange={e => setInstrument(e.target.value)}
                  placeholder="Ex: Guitarra, Bateria..."
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Avaliação Mínima
                </label>
                <select
                  value={minRating}
                  onChange={e => setMinRating(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  <option value="3">3+ estrelas</option>
                  <option value="4">4+ estrelas</option>
                  <option value="4.5">4.5+ estrelas</option>
                  <option value="5">5 estrelas</option>
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleSearch}
            className="w-full mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
          >
            Buscar Músicos
          </button>
        </div>
      </div>

      {/* Lista de músicos */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : musicians.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl text-gray-300">
              Nenhum músico encontrado
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Tente ajustar os filtros de busca
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-400 mb-6">
              {musicians.length} músico{musicians.length !== 1 ? 's' : ''} encontrado{musicians.length !== 1 ? 's' : ''}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {musicians.map(musician => (
                <div
                  key={musician.id}
                  className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all hover:transform hover:scale-105"
                >
                  {/* Foto/Avatar */}
                  <div className="aspect-square bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                    {musician.avatar_url ? (
                      <img
                        src={musician.avatar_url}
                        alt={musician.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-16 h-16 text-white/50" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-1 truncate">
                      {musician.full_name}
                    </h3>
                    
                    {/* Instrumento */}
                    <div className="flex items-center gap-1 text-gray-300 text-sm mb-2">
                      {getInstrumentIcon(musician.instrument)}
                      <span>{musician.instrument}</span>
                    </div>

                    {/* Localização */}
                    {musician.city && musician.state && (
                      <div className="flex items-center gap-1 text-gray-400 text-sm mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>{musician.city} - {musician.state}</span>
                      </div>
                    )}

                    {/* Avaliação */}
                    {musician.average_rating > 0 && (
                      <div className="flex items-center gap-1 mb-4">
                        {renderStars(musician.average_rating)}
                        <span className="text-sm text-gray-400 ml-1">
                          ({musician.total_ratings})
                        </span>
                      </div>
                    )}

                    {/* Bio */}
                    {musician.bio && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                        {musician.bio}
                      </p>
                    )}

                    {/* Botão */}
                    <button
                      onClick={() => handleRequestQuote(musician.id)}
                      className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Solicitar Orçamento
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de Login/Cadastro */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Acesso Necessário
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Para solicitar orçamento, faça login ou cadastre-se como contratante.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/contratante/login')}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Fazer Login
              </button>
              <button
                onClick={() => navigate('/contratante/cadastro')}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                Cadastrar como Contratante
              </button>
            </div>
            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
