import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGeolocation } from '../hooks/useGeolocation';
import { BRAZILIAN_STATE_OPTIONS, getStateAbbreviation } from '../config/locations';
import {
  clearLocationPreference,
  getLocationPreference,
  setLocationPreference,
  type LocationPreference,
} from '../utils/locationPreference';
import { fetchIbgeCitiesByUf } from '../services/ibge';

type CityBadgeVariant = 'dark' | 'light';

interface CityBadgeProps {
  variant?: CityBadgeVariant;
  className?: string;
}

const CityBadge: React.FC<CityBadgeProps> = ({ variant = 'dark', className = '' }) => {
  const { city, state, isLoading, error, getLocation } = useGeolocation({ autoStart: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const [preference, setPreference] = useState<LocationPreference | null>(null);
  const [manualCity, setManualCity] = useState('');
  const [manualState, setManualState] = useState('');
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const datalistId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const existing = getLocationPreference();
    if (existing) {
      setPreference(existing);
      setManualCity(existing.city);
      setManualState(existing.state);
    }
  }, []);

  useEffect(() => {
    const onPreferenceUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail as LocationPreference;
      if (detail?.city && detail?.state) {
        setPreference(detail);
        setManualCity(detail.city);
        setManualState(detail.state);
      }
    };

    const onPreferenceCleared = () => {
      setPreference(null);
      setManualCity('');
      setManualState('');
    };

    window.addEventListener('location:preference-updated', onPreferenceUpdated);
    window.addEventListener('location:preference-cleared', onPreferenceCleared);
    return () => {
      window.removeEventListener('location:preference-updated', onPreferenceUpdated);
      window.removeEventListener('location:preference-cleared', onPreferenceCleared);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', onClickOutside);
    }
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    let active = true;

    if (!manualState) {
      setCityOptions([]);
      setCityError(null);
      setLoadingCities(false);
      return () => {
        active = false;
      };
    }

    setLoadingCities(true);
    setCityError(null);

    fetchIbgeCitiesByUf(manualState)
      .then((data) => {
        if (!active) return;
        setCityOptions(data.map((cityItem) => cityItem.nome));
      })
      .catch(() => {
        if (!active) return;
        setCityOptions([]);
        setCityError('Nao foi possivel carregar as cidades.');
      })
      .finally(() => {
        if (!active) return;
        setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [manualState]);

  const displayCity = preference?.city || city;
  const displayState = preference?.state || state;

  const label = useMemo(() => {
    const stateAbbr = getStateAbbreviation(displayState);

    if (displayCity && stateAbbr) {
      return `${displayCity}, ${stateAbbr}`;
    }

    if (displayCity) return displayCity;

    return stateAbbr;
  }, [displayCity, displayState]);

  const baseClasses =
    variant === 'light'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
      : 'bg-slate-900/90 text-amber-100 border-amber-400/30 shadow-lg shadow-black/40';

  const actionClasses =
    variant === 'light'
      ? 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
      : 'bg-slate-900/80 text-amber-100 border-amber-400/30 hover:bg-slate-800/80';

  const dotClasses =
    variant === 'light'
      ? 'bg-indigo-500/70'
      : 'bg-amber-400/70';

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualCity.trim() || !manualState.trim()) {
      return;
    }
    const saved = setLocationPreference(manualCity, manualState);
    setPreference(saved);
    setMenuOpen(false);
  };

  const handleUseGps = async () => {
    clearLocationPreference();
    setPreference(null);
    await getLocation();
    setMenuOpen(false);
  };

  const badgeText = label ? `Em ${label}` : 'Definir cidade';
  const badgeTitle = preference
    ? `Cidade escolhida: ${label}`
    : label
      ? `Localização detectada: ${label}`
      : error || 'Definir cidade';

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <motion.button
        type="button"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setMenuOpen((prev) => !prev)}
        whileHover={{ y: -1, scale: 1.02 }}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-all duration-200 ${label ? baseClasses : actionClasses} hover:shadow-lg hover:border-amber-300/60`}
        title={badgeTitle}
        disabled={isLoading && !label}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotClasses}`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotClasses}`} />
        </span>
        <MapPin className="h-4 w-4" />
        <span className="truncate max-w-[200px]">{isLoading && !label ? 'Detectando...' : badgeText}</span>
      </motion.button>

      {menuOpen && (
        <div
          className={`absolute right-0 mt-2 w-80 rounded-2xl border p-4 shadow-2xl ring-1 ring-black/20 z-50 ${
            variant === 'light'
              ? 'bg-white border-gray-200'
              : 'bg-slate-950 border-amber-400/30'
          }`}
        >
          <div className={`text-xs font-semibold mb-3 ${variant === 'light' ? 'text-gray-700' : 'text-slate-200'}`}>
            Escolher cidade
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className={`block text-xs mb-1 ${variant === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                Estado
              </label>
              <select
                value={manualState}
                onChange={(event) => {
                  const next = event.target.value;
                  setManualState(next);
                  if (next !== manualState) {
                    setManualCity('');
                  }
                }}
                className={`w-full rounded-lg px-3 py-2 text-sm border focus:ring-2 ${
                  variant === 'light'
                    ? 'border-gray-200 focus:ring-indigo-500/30'
                    : 'border-amber-400/30 bg-slate-950 text-white focus:ring-amber-400/40'
                }`}
              >
                <option value="">Selecione...</option>
                {BRAZILIAN_STATE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label} ({value})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${variant === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                Cidade
              </label>
              <input
                type="text"
                value={manualCity}
                onChange={(event) => setManualCity(event.target.value)}
                placeholder={manualState ? 'Ex: Uberlândia' : 'Selecione um estado primeiro'}
                list={datalistId}
                disabled={!manualState}
                className={`w-full rounded-lg px-3 py-2 text-sm border focus:ring-2 ${
                  variant === 'light'
                    ? 'border-gray-200 focus:ring-indigo-500/30'
                    : 'border-amber-400/30 bg-slate-950 text-white focus:ring-amber-400/40'
                } ${!manualState ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              <datalist id={datalistId}>
                {cityOptions.map((cityName) => (
                  <option key={cityName} value={cityName} />
                ))}
              </datalist>
              <div className={`mt-1 text-[11px] ${variant === 'light' ? 'text-gray-500' : 'text-slate-400'}`}>
                {!manualState
                  ? 'Selecione o estado para carregar as cidades.'
                  : loadingCities
                    ? 'Carregando cidades...'
                    : 'Digite para filtrar as cidades.'}
              </div>
              {cityError && (
                <div className={`mt-1 text-[11px] ${variant === 'light' ? 'text-red-500' : 'text-red-300'}`}>
                  {cityError}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                  variant === 'light'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={handleUseGps}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold border inline-flex items-center justify-center gap-2 ${
                  variant === 'light'
                    ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    : 'border-amber-400/30 text-slate-100 hover:bg-slate-900'
                }`}
              >
                <Navigation className="h-3.5 w-3.5" />
                Usar GPS
              </button>
            </div>
          </form>

          {preference && (
            <button
              type="button"
              onClick={() => {
                clearLocationPreference();
                setPreference(null);
                setMenuOpen(false);
              }}
              className={`mt-3 text-xs underline underline-offset-2 ${
                variant === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-slate-300 hover:text-slate-100'
              }`}
            >
              Limpar preferência
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CityBadge;
