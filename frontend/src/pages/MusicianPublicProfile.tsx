import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  MapPin,
  Music,
  Instagram,
  MessageSquare,
  Building2,
  UserPlus,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import FullscreenBackground from '../components/Layout/FullscreenBackground';
import Loading from '../components/common/Loading';
import {
  contactRequestService,
  publicMusicianService,
  type MusicianPublic,
  type Organization,
} from '../services/publicApi';
import { useCompanyAuth } from '../contexts/CompanyAuthContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { showToast } from '../utils/toast';
import { formatInstrumentLabel } from '../utils/formatting';
import { getCityDisplayName, getActiveCities, type City } from '../config/cities';

const MusicianPublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated: isCompanyAuth } = useCompanyAuth();

  const [musician, setMusician] = useState<MusicianPublic | null>(null);
  const [sponsors, setSponsors] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState<City | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [sendingContact, setSendingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    event_date: '',
    event_location: '',
    budget_range: '',
  });

  useBodyScrollLock(showContactModal);

  // Get city from query params or use first active city
  useEffect(() => {
    const cityParam = searchParams.get('city');
    const stateParam = searchParams.get('state');

    if (cityParam && stateParam) {
      // Find matching city from config
      const activeCities = getActiveCities();
      const matchedCity = activeCities.find(
        c => c.name.toLowerCase() === cityParam.toLowerCase() && c.state === stateParam
      );
      if (matchedCity) {
        setCity(matchedCity);
        return;
      }
    }

    // Default to first active city
    const activeCities = getActiveCities();
    if (activeCities.length > 0) {
      setCity(activeCities[0]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const musicianData = await publicMusicianService.getPublicProfile(Number(id));
        setMusician(musicianData);

        // Fetch sponsors for the city context
        if (city) {
          try {
            const sponsorsData = await publicMusicianService.listSponsors(city.name, city.state);
            setSponsors(sponsorsData);
          } catch {
            // Sponsors are optional
          }
        }
      } catch (err) {
        console.error('Error fetching musician:', err);
        setError('Músico não encontrado');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, city]);

  const handleContactClick = () => {
    if (isCompanyAuth) {
      setShowContactModal(true);
    } else {
      // Redirect to company registration
      navigate('/cadastro-empresa');
    }
  };

  const handleContactChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContactSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!musician || sendingContact) return;

    const subject = contactForm.subject.trim();
    const message = contactForm.message.trim();

    if (!subject || !message) {
      showToast.error('Preencha o assunto e a mensagem.');
      return;
    }

    setSendingContact(true);
    try {
      await contactRequestService.create({
        to_musician: musician.id,
        subject,
        message,
        event_date: contactForm.event_date || undefined,
        event_location: contactForm.event_location.trim() || undefined,
        budget_range: contactForm.budget_range.trim() || undefined,
      });
      showToast.success('Contato enviado com sucesso!');
      setShowContactModal(false);
      setContactForm({
        subject: '',
        message: '',
        event_date: '',
        event_location: '',
        budget_range: '',
      });
    } catch (contactError) {
      showToast.apiError(contactError);
    } finally {
      setSendingContact(false);
    }
  };

  const backLink = city ? `/cidades/${city.slug}` : '/';

  if (loading) {
    return (
      <FullscreenBackground enableBlueWaves>
        <div className="flex justify-center items-center min-h-screen">
          <Loading text="Carregando perfil..." />
        </div>
      </FullscreenBackground>
    );
  }

  if (error || !musician) {
    return (
      <FullscreenBackground enableBlueWaves>
        <div className="container mx-auto px-4 py-20 text-center">
          <Music className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <p className="text-xl text-gray-400 mb-6">{error || 'Músico não encontrado'}</p>
          <Link
            to={backLink}
            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </Link>
        </div>
      </FullscreenBackground>
    );
  }

  return (
    <FullscreenBackground enableBlueWaves>
      <div className="relative z-10 min-h-screen">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-6">
          <Link
            to={backLink}
            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            {city ? `Voltar para músicos de ${city.name}` : 'Voltar'}
          </Link>
        </div>

        {/* Profile Card */}
        <section className="container mx-auto px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 max-w-4xl mx-auto"
          >
            {/* Cover Image */}
            <div className="h-48 md:h-64 bg-gradient-to-r from-primary-600/30 to-indigo-600/30 relative">
              {musician.cover_image_url && (
                <img src={musician.cover_image_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            {/* Profile Info */}
            <div className="relative px-6 pb-6">
              {/* Avatar */}
              <div className="relative -mt-16 mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-slate-900 overflow-hidden bg-gradient-to-br from-primary-500 to-indigo-500 mx-auto md:mx-0">
                  {musician.avatar_url ? (
                    <img
                      src={musician.avatar_url}
                      alt={musician.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                      {musician.full_name?.[0] || '?'}
                    </div>
                  )}
                </div>
              </div>

              {/* Name and Info */}
              <div className="text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {musician.full_name}
                </h1>

                {/* Rating */}
                {musician.total_ratings > 0 && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-amber-400 mb-3">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="text-lg font-semibold">
                      {Number(musician.average_rating).toFixed(1)}
                    </span>
                    <span className="text-gray-400">
                      ({musician.total_ratings}{' '}
                      {musician.total_ratings === 1 ? 'avaliação' : 'avaliações'})
                    </span>
                  </div>
                )}

                {/* Instruments */}
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                  {musician.instrument && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-600/20 text-primary-300 rounded-full text-sm font-medium">
                      <Music className="h-4 w-4" />
                      {formatInstrumentLabel(musician.instrument)}
                    </span>
                  )}
                  {musician.instruments?.map(
                    inst =>
                      inst !== musician.instrument && (
                        <span
                          key={inst}
                          className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-sm"
                        >
                          {formatInstrumentLabel(inst)}
                        </span>
                      )
                  )}
                </div>

                {/* Location */}
                {(musician.city || musician.state) && (
                  <div className="flex items-center justify-center md:justify-start gap-1 text-gray-400 mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {musician.city}
                      {musician.city && musician.state && ' - '}
                      {musician.state}
                    </span>
                  </div>
                )}

                {/* Instagram */}
                {musician.instagram && (
                  <a
                    href={`https://instagram.com/${musician.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors mb-4"
                  >
                    <Instagram className="h-5 w-5" />
                    <span>{musician.instagram}</span>
                  </a>
                )}
              </div>

              {/* Bio */}
              {musician.bio && (
                <div className="mt-6 p-4 bg-white/5 rounded-xl">
                  <h2 className="text-lg font-semibold text-white mb-2">Sobre</h2>
                  <p className="text-gray-300 whitespace-pre-wrap">{musician.bio}</p>
                </div>
              )}

              {/* Contact CTA */}
              <div className="mt-6">
                <button
                  onClick={handleContactClick}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
                >
                  <MessageSquare className="h-5 w-5" />
                  Solicitar Contato
                </button>
                {!isCompanyAuth && (
                  <p className="text-gray-400 text-sm mt-2 text-center md:text-left">
                    Você precisa ter uma conta de empresa para entrar em contato.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Sponsors Section */}
        {sponsors.length > 0 && city && (
          <section className="container mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 max-w-4xl mx-auto"
            >
              <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Patrocinadores de {getCityDisplayName(city)}
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

        {/* CTAs Section */}
        <section className="container mx-auto px-4 py-16 border-t border-white/10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Quer fazer parte do GigFlow?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/cadastro-empresa"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
              >
                <Building2 className="h-5 w-5" />É empresa? Cadastre-se
              </Link>
              <Link
                to="/solicitar-acesso"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border-2 border-white/30 hover:border-white/50 transition-all text-lg"
              >
                <UserPlus className="h-5 w-5" />É músico? Solicite acesso
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 text-center">
          <p className="text-gray-400 text-sm">© 2026 DXM Tech. Todos os direitos reservados.</p>
        </footer>
      </div>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && musician && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => !sendingContact && setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={event => event.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Solicitar contato</h2>
                  <p className="text-sm text-gray-500">
                    Envie uma mensagem para {musician.full_name}
                  </p>
                </div>
                <button
                  onClick={() => !sendingContact && setShowContactModal(false)}
                  disabled={sendingContact}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  aria-label="Fechar"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleContactSubmit} className="p-6 space-y-5">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Assunto *
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    value={contactForm.subject}
                    onChange={handleContactChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ex: Proposta para show em bar"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={contactForm.message}
                    onChange={handleContactChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Conte detalhes sobre o evento e sua necessidade"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="event_date"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Data do evento
                    </label>
                    <input
                      id="event_date"
                      name="event_date"
                      type="date"
                      value={contactForm.event_date}
                      onChange={handleContactChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="event_location"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Local
                    </label>
                    <input
                      id="event_location"
                      name="event_location"
                      type="text"
                      value={contactForm.event_location}
                      onChange={handleContactChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ex: Centro da cidade"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="budget_range"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Faixa de orçamento
                  </label>
                  <input
                    id="budget_range"
                    name="budget_range"
                    type="text"
                    value={contactForm.budget_range}
                    onChange={handleContactChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ex: R$ 800 - R$ 1.200"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    disabled={sendingContact}
                    className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sendingContact}
                    className="px-6 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50"
                  >
                    {sendingContact ? 'Enviando...' : 'Enviar contato'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FullscreenBackground>
  );
};

export default MusicianPublicProfile;
