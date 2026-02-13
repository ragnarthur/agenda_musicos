import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Music, Building2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import AppVersionMessage from '../components/common/AppVersionMessage';
import Loading from '../components/common/Loading';
import { getCityBySlug, getCityDisplayName, type City } from '../config/cities';
import {
  publicMusicianService,
  type MusicianPublic,
  type Organization,
} from '../services/publicApi';
import { formatInstrumentLabel, normalizeInstrumentKey } from '../utils/formatting';
import { usePageMeta } from '../hooks/usePageMeta';
import { showToast } from '../utils/toast';

const CityLanding: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [musicians, setMusicians] = useState<MusicianPublic[]>([]);
  const [sponsors, setSponsors] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('all');
  const [city, setCity] = useState<City | null>(null);

  usePageMeta({
    title: city ? `Músicos em ${getCityDisplayName(city)} - GigFlow` : 'Músicos por Cidade - GigFlow',
    description: city
      ? `Encontre músicos profissionais em ${getCityDisplayName(city)}. Veja perfis, avaliações e solicite orçamentos.`
      : 'Encontre músicos profissionais na sua cidade.',
  });

  useEffect(() => {
    if (!slug) {
      navigate('/');
      return;
    }

    const foundCity = getCityBySlug(slug);
    if (!foundCity || !foundCity.active) {
      navigate('/');
      return;
    }

    setCity(foundCity);
  }, [slug, navigate]);

  useEffect(() => {
    if (!city) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [musiciansData, sponsorsData] = await Promise.all([
          publicMusicianService.listByCity(city.name, city.state),
          publicMusicianService.listSponsors(city.name, city.state),
        ]);
        setMusicians(musiciansData);
        setSponsors(sponsorsData);
      } catch (error) {
        console.error('Error fetching city data:', error);
        showToast.error('Erro ao carregar dados da cidade');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [city]);

  // Get unique instruments from musicians
  const instruments = useMemo(() => {
    const instrumentSet = new Set<string>();
    musicians.forEach(m => {
      if (m.instrument) instrumentSet.add(normalizeInstrumentKey(m.instrument));
      if (m.instruments) m.instruments.forEach(i => instrumentSet.add(normalizeInstrumentKey(i)));
    });
    return Array.from(instrumentSet).filter(Boolean).sort();
  }, [musicians]);

  // Filter musicians by selected instrument
  const filteredMusicians = useMemo(() => {
    if (selectedInstrument === 'all') return musicians;
    return musicians.filter(
      m =>
        normalizeInstrumentKey(m.instrument) === selectedInstrument ||
        (m.instruments &&
          m.instruments.some(inst => normalizeInstrumentKey(inst) === selectedInstrument))
    );
  }, [musicians, selectedInstrument]);

  if (!city) {
    return (
      <FullscreenBackground enableBlueWaves>
        <div className="flex justify-center items-center min-h-[100svh]">
          <Loading text="Carregando..." />
        </div>
      </FullscreenBackground>
    );
  }

  return (
    <FullscreenBackground enableBlueWaves>
      <div className="relative z-10 min-h-[100svh]">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-10 sm:py-12 md:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-2 text-primary-400 mb-4">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-base sm:text-lg font-medium">
                {getCityDisplayName(city)}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              Músicos em {city.name}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              {city.description || `Encontre os melhores músicos de ${city.name} para seu evento.`}
            </p>
          </motion.div>
        </section>

        {/* Sponsors Section */}
        {sponsors.length > 0 && (
          <section className="container mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
            >
              <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Patrocinadores de {city.name}
              </h2>
              <div className="flex flex-wrap justify-center gap-6">
                {sponsors.map(sponsor => (
                  <a
                    key={sponsor.id}
                    href={sponsor.website || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="h-10 w-10 object-contain rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-primary-600/30 rounded flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary-400" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-white font-medium">{sponsor.name}</p>
                      {sponsor.sponsor_tier && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            sponsor.sponsor_tier === 'gold'
                              ? 'bg-amber-500/20 text-amber-300'
                              : sponsor.sponsor_tier === 'silver'
                                ? 'bg-gray-400/20 text-gray-300'
                                : 'bg-orange-700/20 text-orange-300'
                          }`}
                        >
                          {sponsor.sponsor_tier === 'gold'
                            ? 'Ouro'
                            : sponsor.sponsor_tier === 'silver'
                              ? 'Prata'
                              : 'Bronze'}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </motion.div>
          </section>
        )}

        {/* Instrument Filter */}
        <section className="container mx-auto px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap items-center gap-2 justify-center"
          >
            <button
              onClick={() => setSelectedInstrument('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedInstrument === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Todos
            </button>
            {instruments.map(instrument => (
              <button
                key={instrument}
                onClick={() => setSelectedInstrument(instrument)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedInstrument === instrument
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {formatInstrumentLabel(instrument)}
              </button>
            ))}
          </motion.div>
        </section>

        {/* Musicians Grid */}
        <section className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loading text="Carregando músicos..." />
            </div>
          ) : filteredMusicians.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Music className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-xl text-gray-400">
                {selectedInstrument === 'all'
                  ? `Nenhum músico encontrado em ${city.name}.`
                  : `Nenhum músico de ${formatInstrumentLabel(selectedInstrument)} encontrado em ${city.name}.`}
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredMusicians.map((musician, index) => (
                <MusicianCard
                  key={musician.id}
                  musician={musician}
                  delay={index * 0.05}
                  city={city}
                />
              ))}
            </motion.div>
          )}
        </section>

        {/* CTAs Section */}
        <section className="container mx-auto px-4 py-16 border-t border-white/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Quer fazer parte do GigFlow?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contratante/cadastro"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-8 sm:py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-base sm:text-lg"
              >
                <Building2 className="h-5 w-5" />É contratante? Cadastre-se
              </Link>
              <Link
                to="/solicitar-acesso"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-8 sm:py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border-2 border-white/30 hover:border-white/50 transition-all text-base sm:text-lg"
              >
                <UserPlus className="h-5 w-5" />É músico? Solicite acesso
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 text-center">
          <p className="text-gray-400 text-sm">© 2026 DXM Tech. Todos os direitos reservados.</p>
          <AppVersionMessage className="mt-1 text-xs text-gray-500" />
        </footer>
      </div>
    </FullscreenBackground>
  );
};

// Musician Card Component
interface MusicianCardProps {
  musician: MusicianPublic;
  delay: number;
  city: City;
}

const MusicianCard: React.FC<MusicianCardProps> = ({ musician, delay, city }) => {
  const primaryInstrumentKey = normalizeInstrumentKey(musician.instrument);
  const secondaryInstruments = Array.from(
    new Set(
      (musician.instruments || [])
        .map(inst => normalizeInstrumentKey(inst))
        .filter(inst => inst && inst !== primaryInstrumentKey)
    )
  );
  const visibleSecondary = secondaryInstruments.slice(0, 2);
  const extraCount = secondaryInstruments.length - visibleSecondary.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -5 }}
    >
      <Link
        to={`/musico/${musician.id}?city=${encodeURIComponent(city.name)}&state=${city.state}`}
        className="block bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-primary-500/50 transition-all group"
      >
        {/* Cover Image */}
        <div className="h-24 bg-gradient-to-r from-primary-600/30 to-indigo-600/30 relative">
          {musician.cover_image_url && (
            <img src={musician.cover_image_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Avatar */}
        <div className="relative -mt-10 px-4">
          <div className="w-20 h-20 rounded-full border-4 border-slate-900 overflow-hidden bg-gradient-to-br from-primary-500 to-indigo-500">
            {musician.avatar_url ? (
              <img
                src={musician.avatar_url}
                alt={musician.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                {musician.full_name?.[0] || '?'}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pt-2">
          <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors">
            {musician.full_name}
          </h3>

          {/* Rating */}
          {musician.total_ratings > 0 && (
            <div className="flex items-center gap-1 text-amber-400 mt-1">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-medium">
                {Number(musician.average_rating).toFixed(1)}
              </span>
              <span className="text-gray-400 text-sm">
                ({musician.total_ratings}{' '}
                {musician.total_ratings === 1 ? 'avaliação' : 'avaliações'})
              </span>
            </div>
          )}

          {/* Instruments */}
          <div className="flex flex-wrap gap-1 mt-3">
            {primaryInstrumentKey && (
              <span className="px-2 py-1 bg-primary-600/20 text-primary-300 rounded-full text-xs font-medium">
                {formatInstrumentLabel(primaryInstrumentKey)}
              </span>
            )}
            {visibleSecondary.map(inst => (
              <span
                key={inst}
                className="px-2 py-1 bg-white/10 text-gray-300 rounded-full text-xs"
              >
                {formatInstrumentLabel(inst)}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="px-2 py-1 bg-white/5 text-gray-400 rounded-full text-xs">
                +{extraCount}
              </span>
            )}
          </div>

          {/* Bio preview */}
          {musician.bio && (
            <p className="text-gray-400 text-sm mt-3 line-clamp-2">{musician.bio}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export default CityLanding;
