import React, { useEffect, useState, useRef } from 'react';
import { MapPin, X, Mail, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeolocation } from '../hooks/useGeolocation';
import { fetchIbgeCitiesByUf } from '../services/ibge';
import { BRAZILIAN_STATE_OPTIONS } from '../config/locations';

const CITIES_IN_SOON = [
  { value: 'sao_paulo_sp', label: 'São Paulo, SP' },
  { value: 'rio_de_janeiro_rj', label: 'Rio de Janeiro, RJ' },
  { value: 'belo_horizonte_mg', label: 'Belo Horizonte, MG' },
  { value: 'brasilia_df', label: 'Brasília, DF' },
];

interface CityDisplayProps {
  onDismiss?: () => void;
}

const AUTO_DISMISS_MS = 12000;

const CityDisplay: React.FC<CityDisplayProps> = ({ onDismiss }) => {
  const { city, state, isMonteCarmelo, isLoading, error, reset } = useGeolocation();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', state: '', city: '' });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [isVisible, setIsVisible] = useState(true);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const datalistId = useRef(`cities-datalist-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!isVisible) return;
    if (isLoading || error || showForm || formStatus !== 'idle') return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [isVisible, isLoading, error, showForm, formStatus, onDismiss]);

  useEffect(() => {
    let active = true;

    if (!formData.state) {
      setCityOptions([]);
      setCityError(null);
      setLoadingCities(false);
      return () => {
        active = false;
      };
    }

    setLoadingCities(true);
    setCityError(null);
    setFormData(prev => ({ ...prev, city: '' }));

    fetchIbgeCitiesByUf(formData.state)
      .then(data => {
        if (!active) return;
        setCityOptions(data.map(cityItem => cityItem.nome));
      })
      .catch(() => {
        if (!active) return;
        setCityOptions([]);
        setCityError('Não foi possível carregar as cidades.');
      })
      .finally(() => {
        if (!active) return;
        setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [formData.state]);

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, state: e.target.value, city: '' }));
  };

  const handleCitySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, city: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.state || !formData.city) {
      return;
    }

    const normalizedCity = formData.city.trim().toLowerCase();
    const isCityValid = cityOptions.some(cityName => cityName.toLowerCase() === normalizedCity);

    if (!isCityValid) {
      setCityError('Por favor, selecione uma cidade válida da lista.');
      return;
    }

    setFormStatus('submitting');
    setCityError(null);

    setTimeout(() => {
      setFormStatus('success');
      setTimeout(() => {
        setShowForm(false);
        setFormStatus('idle');
        setFormData({ email: '', state: '', city: '' });
      }, 2000);
    }, 1000);
  };

  const handleDismiss = () => {
    setShowForm(false);
    setFormStatus('idle');
    setIsVisible(false);
    onDismiss?.();
  };

  const handleQuickCity = () => {
    setShowForm(true);
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="fixed top-4 sm:top-6 md:top-8 left-0 right-0 mx-4 sm:mx-auto z-50 w-auto sm:w-[calc(100%-2rem)] md:w-auto max-w-2xl"
      >
        <div className="bg-amber-500/25 backdrop-blur-md rounded-2xl border border-amber-500/30 px-2.5 py-2.5 sm:px-6 sm:py-4 shadow-2xl w-full">
          <div className="flex items-center gap-3">
            <div className="animate-spin flex-shrink-0">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-amber-100 font-medium text-xs sm:text-sm break-words">
                Detectando sua localização...
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="fixed top-4 sm:top-6 md:top-8 left-0 right-0 mx-4 sm:mx-auto z-50 w-auto sm:w-[calc(100%-2rem)] md:w-auto max-w-2xl"
      >
        <div className="bg-red-500/25 backdrop-blur-md rounded-2xl border border-red-500/30 px-2.5 py-2.5 sm:px-6 sm:py-4 shadow-2xl w-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-red-100 font-medium text-xs sm:text-sm mb-2 break-words">
                Não foi possível detectar sua localização
              </p>
              <p className="text-red-200/85 text-xs leading-relaxed break-words">{error}</p>
              <button
                onClick={reset}
                className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-100 text-sm font-medium rounded-lg transition-all"
              >
                Tentar Novamente
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (formStatus === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="fixed top-4 sm:top-6 md:top-8 left-0 right-0 mx-4 sm:mx-auto z-50 w-auto sm:w-[calc(100%-2rem)] md:w-auto max-w-md"
      >
        <div className="bg-green-500/25 backdrop-blur-md rounded-2xl border border-green-500/30 px-2.5 py-2.5 sm:px-8 sm:py-6 shadow-2xl w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-green-100 font-semibold text-sm sm:text-base md:text-lg mb-1 break-words">
                Registrado com Sucesso!
              </p>
              <p className="text-green-200/85 text-xs sm:text-sm break-words">
                Você será notificado quando chegarmos em sua cidade.
              </p>
              <button
                onClick={handleDismiss}
                className="mt-4 px-6 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-100 font-medium rounded-lg transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="fixed top-4 sm:top-6 md:top-8 left-0 right-0 mx-4 sm:mx-auto z-50 w-auto sm:w-[calc(100%-2rem)] md:w-auto max-w-2xl"
        >
          <div
            className={`${
              isMonteCarmelo
                ? 'bg-gradient-to-r from-amber-500/25 via-amber-400/28 to-amber-500/25'
                : 'bg-amber-500/25'
            } backdrop-blur-md rounded-2xl border border-amber-500/30 px-2.5 py-2.5 sm:px-6 sm:py-4 shadow-2xl w-full`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={`${
                  isMonteCarmelo ? 'bg-amber-500/20' : 'bg-amber-500/10'
                } p-1.5 sm:p-2 rounded-full flex-shrink-0`}
              >
                <MapPin
                  className={`h-5 w-5 sm:h-6 sm:w-6 ${isMonteCarmelo ? 'text-amber-300' : 'text-amber-400'}`}
                />
              </div>

              <div className="flex-1 min-w-0">
                {isMonteCarmelo ? (
                  <>
                    <p className="text-amber-100 font-bold text-sm sm:text-base md:text-lg mb-1 flex items-start gap-2 break-words">
                      🎉 Monte Carmelo é parceiro do GigFlow!
                    </p>
                    <p className="text-amber-200/90 text-xs sm:text-sm break-words">
                      Que bom ver você por aqui. A plataforma já está ativa na sua região.
                    </p>
                    <div className="flex flex-col xs:flex-row flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-all text-sm shadow-lg hover:shadow-xl"
                      >
                        Solicitar Acesso
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-amber-200 hover:text-amber-100 font-medium rounded-lg transition-all text-sm border border-amber-500/20"
                      >
                        Ver depois
                      </button>
                    </div>
                    <p className="text-amber-200/70 text-xs mt-3">Também estamos chegando em:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {CITIES_IN_SOON.map(cityOption => (
                        <button
                          key={cityOption.value}
                          onClick={() => handleQuickCity()}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-amber-100 text-xs rounded-full border border-amber-500/20 transition-all"
                        >
                          {cityOption.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-amber-100 font-semibold text-sm sm:text-base mb-1 break-words">
                      Olá! Detectamos você em {city}, {state}.
                    </p>
                    <p className="text-amber-200/85 text-xs sm:text-sm mb-3 break-words">
                      Estamos abrindo novas cidades agora — quer ser avisado quando chegar na sua
                      região?
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {CITIES_IN_SOON.map(cityOption => (
                        <button
                          key={cityOption.value}
                          onClick={() => handleQuickCity()}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-amber-100 text-xs rounded-full border border-amber-500/20 transition-all"
                        >
                          {cityOption.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col xs:flex-row flex-wrap gap-2">
                      <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-all text-sm shadow-lg hover:shadow-xl"
                      >
                        Quero ser avisado
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-amber-200 hover:text-amber-100 font-medium rounded-lg transition-all text-sm border border-amber-500/20"
                      >
                        Fechar
                      </button>
                    </div>
                    <p className="text-amber-200/70 text-xs mt-2">
                      Esta mensagem fecha automaticamente em alguns segundos.
                    </p>
                  </>
                )}
              </div>

              <button
                onClick={handleDismiss}
                className="text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 sm:top-6 md:top-8 left-0 right-0 mx-4 sm:mx-auto z-50 w-auto sm:w-[calc(100%-2rem)] md:w-auto max-w-md"
        >
          <div className="bg-amber-500/25 backdrop-blur-md rounded-2xl border border-amber-500/30 px-2.5 py-2.5 sm:px-6 sm:py-5 shadow-2xl w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-amber-500/10 p-2 sm:p-2.5 rounded-full flex-shrink-0">
                <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-amber-100 font-bold text-sm sm:text-base md:text-lg mb-1 break-words">
                  Receber Notificações
                </h3>
                <p className="text-amber-200/85 text-xs sm:text-sm mb-4 break-words">
                  Seja notificado quando o GigFlow chegar em sua região!
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-amber-100 text-sm font-medium mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="seu@email.com"
                      required
                      className="w-full px-4 py-2.5 bg-white/10 border border-amber-500/30 rounded-lg text-amber-100 placeholder:text-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-500/50 text-sm"
                      disabled={formStatus === 'submitting'}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="state"
                      className="block text-amber-100 text-sm font-medium mb-1.5"
                    >
                      Estado
                    </label>
                    <select
                      id="state"
                      value={formData.state}
                      onChange={handleStateSelect}
                      required
                      disabled={formStatus === 'submitting'}
                      className="w-full px-4 py-2.5 bg-white/10 border border-amber-500/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-500/50 text-sm cursor-pointer disabled:opacity-50"
                    >
                      <option value="">Selecione o estado...</option>
                      {BRAZILIAN_STATE_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="city"
                      className="block text-amber-100 text-sm font-medium mb-1.5"
                    >
                      Cidade
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={formData.city}
                      onChange={handleCitySelect}
                      placeholder={
                        formData.state ? 'Ex: Uberlândia' : 'Selecione o estado primeiro'
                      }
                      list={datalistId.current}
                      required
                      disabled={!formData.state || loadingCities || formStatus === 'submitting'}
                      className="w-full px-4 py-2.5 bg-white/10 border border-amber-500/30 rounded-lg text-amber-100 placeholder:text-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-500/50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <datalist id={datalistId.current}>
                      {cityOptions.map(cityName => (
                        <option key={cityName} value={cityName} />
                      ))}
                    </datalist>
                    <div className="mt-1 text-xs text-amber-200/70">
                      {!formData.state
                        ? 'Selecione o estado para carregar as cidades.'
                        : loadingCities
                          ? 'Carregando cidades...'
                          : cityError
                            ? cityError
                            : 'Digite para filtrar as cidades.'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-amber-200 hover:text-amber-100 font-medium rounded-lg transition-all text-sm border border-amber-500/20"
                      disabled={formStatus === 'submitting'}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={formStatus === 'submitting'}
                      className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-all text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {formStatus === 'submitting' ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-amber-300 border-t-transparent animate-spin rounded-full" />
                          Enviando...
                        </span>
                      ) : (
                        'Me Avise!'
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <button
                onClick={handleDismiss}
                className="text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0 absolute top-3 right-3"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CityDisplay;
