// pages/FinancialSettings.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Coins,
  Plus,
  Trash2,
  Wallet,
  CarFront,
  Sparkles,
  Loader2,
  FileText,
  Music,
  Check,
  Disc3,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout/Layout';
import { musicianService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useInstruments } from '../hooks/useInstruments';
import type { EquipmentItem, MusicianUpdatePayload, Musician } from '../types';
import { formatCurrency, formatInstrumentLabel } from '../utils/formatting';
import { logError } from '../utils/logger';
import { sanitizeOptionalText, sanitizeText } from '../utils/sanitize';
import { getErrorMessage } from '../utils/toast';
import { MUSICAL_GENRES } from '../config/genres';

type EquipmentRow = {
  name: string;
  price: string;
};

const DEFAULT_EQUIPMENTS: EquipmentRow[] = [
  { name: 'Som completo', price: '' },
  { name: 'Mesa de som', price: '' },
  { name: 'Microfones', price: '' },
];

const parseDecimal = (value: string): number | null => {
  if (!value) return null;

  const cleaned = value.replace(/\s/g, '');

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  let sanitized = cleaned;

  if (hasComma && hasDot) {
    sanitized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    sanitized = cleaned.replace(',', '.');
  } else {
    sanitized = cleaned;
  }

  const num = Number(sanitized);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : null;
};

const formatCurrencyMask = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = parseDecimal(String(value));
  if (parsed === null) return '';
  return parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const maskCurrencyInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = Number(digits) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const handleCurrencyChange =
  (setter: (val: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCurrencyInput(event.target.value);
    setter(masked);
  };

const handleCurrencyBlur =
  (setter: (val: string) => void) => (event: React.FocusEvent<HTMLInputElement>) => {
    const masked = formatCurrencyMask(event.target.value);
    setter(masked);
  };

const FinancialSettings: React.FC = () => {
  const { refreshUser, user } = useAuth();
  const navigate = useNavigate();
  const { instruments: availableInstruments, loading: loadingInstruments } = useInstruments();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [travelFee, setTravelFee] = useState('');
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>(DEFAULT_EQUIPMENTS);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [primaryInstrument, setPrimaryInstrument] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const hydrateForm = useCallback((musician: Musician) => {
    setFirstName(musician.user?.first_name ?? '');
    setLastName(musician.user?.last_name ?? '');
    setBio(musician.bio ?? '');
    setBaseFee(formatCurrencyMask(musician.base_fee ?? ''));
    setTravelFee(formatCurrencyMask(musician.travel_fee_per_km ?? ''));

    const rows =
      musician.equipment_items && musician.equipment_items.length > 0
        ? musician.equipment_items.map((item: EquipmentItem) => ({
            name: item.name || '',
            price: formatCurrencyMask(item.price ?? ''),
          }))
        : DEFAULT_EQUIPMENTS;
    setEquipmentRows(rows);

    const instrumentsList =
      musician.instruments && musician.instruments.length > 0
        ? [...musician.instruments]
        : musician.instrument
          ? [musician.instrument]
          : [];
    const mainInstrument = musician.instrument || instrumentsList[0] || '';
    const normalizedList = mainInstrument
      ? [mainInstrument, ...instrumentsList.filter(inst => inst !== mainInstrument)]
      : instrumentsList;
    setSelectedInstruments(normalizedList);
    setPrimaryInstrument(mainInstrument);
    setSelectedGenres(musician.musical_genres || []);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const me = await musicianService.getMe();
      hydrateForm(me);
    } catch (error) {
      logError('Erro ao carregar perfil financeiro:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [hydrateForm]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAddEquipment = () => {
    setEquipmentRows(prev => [...prev, { name: '', price: '' }]);
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipmentRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleEquipmentChange = (index: number, field: keyof EquipmentRow, value: string) => {
    setEquipmentRows(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const toggleInstrument = (instrumentName: string) => {
    setSelectedInstruments(prev => {
      if (prev.includes(instrumentName)) {
        const next = prev.filter(i => i !== instrumentName);
        setPrimaryInstrument(currentPrimary =>
          currentPrimary === instrumentName ? next[0] || '' : currentPrimary
        );
        return next;
      }
      if (prev.length >= 10) {
        toast.error('Máximo de 10 instrumentos permitidos');
        return prev;
      }
      const next = [...prev, instrumentName];
      setPrimaryInstrument(currentPrimary => currentPrimary || instrumentName);
      return next;
    });
  };

  const handlePrimaryChange = (instrumentName: string) => {
    setPrimaryInstrument(instrumentName);
    setSelectedInstruments(prev => {
      if (!instrumentName) return prev;
      if (!prev.includes(instrumentName)) {
        return [instrumentName, ...prev];
      }
      return [instrumentName, ...prev.filter(inst => inst !== instrumentName)];
    });
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      }
      if (prev.length >= 5) {
        toast.error('Máximo de 5 gêneros');
        return prev;
      }
      return [...prev, genre];
    });
  };

  const getInstrumentDisplay = (instrumentName: string) => {
    const match = availableInstruments.find(inst => inst.name === instrumentName);
    return match?.display_name || formatInstrumentLabel(instrumentName);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const normalizedFirstName = sanitizeText(firstName, 150);
    const normalizedLastName = sanitizeText(lastName, 150);

    if (!normalizedFirstName || !normalizedLastName) {
      toast.error('Nome e sobrenome sao obrigatorios.');
      setSaving(false);
      return;
    }

    const mainInstrument = primaryInstrument || selectedInstruments[0] || '';
    const orderedInstruments = mainInstrument
      ? [mainInstrument, ...selectedInstruments.filter(inst => inst !== mainInstrument)]
      : selectedInstruments;
    const payload: MusicianUpdatePayload = {
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      bio: sanitizeOptionalText(bio, 350) ?? '',
      base_fee: parseDecimal(baseFee),
      travel_fee_per_km: parseDecimal(travelFee),
      equipment_items: equipmentRows
        .map(item => ({
          name: sanitizeText(item.name, 80),
          price: parseDecimal(item.price),
        }))
        .filter(item => item.name.length > 0),
      instrument: mainInstrument,
      instruments: orderedInstruments,
      musical_genres: selectedGenres,
    };

    try {
      const updated = await musicianService.updateMe(payload);
      hydrateForm(updated);
      await refreshUser();
      toast.success('Valores salvos com sucesso!');
      const userId = user?.id ?? user?.user?.id;
      navigate(userId ? `/musicos/${userId}` : '/musicos');
    } catch (error) {
      logError('Erro ao salvar valores:', error);
      const message = getErrorMessage(error);
      if (message.toLowerCase().includes('limite mensal') && message.toLowerCase().includes('nome')) {
        toast.error('Limite mensal atingido. Você pode alterar o nome apenas 2 vezes por mês.');
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-200">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando seus valores...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-shell max-w-4xl py-4 sm:py-6">
        {/* Header */}
        <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-3 dark:text-slate-300 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Wallet className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Valores & Serviços
                </h1>
                <p className="text-muted">
                  Cadastre seu cachê, taxas por deslocamento e pacotes de equipamentos.
                </p>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/70 border border-slate-200/70 rounded-xl px-3 py-2 text-sm text-slate-700 shadow-sm dark:bg-white/5 dark:border-white/10 dark:text-slate-200">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            <span>Informações visíveis nos convites</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do perfil */}
          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Dados do perfil
                </h2>
                <p className="text-muted text-sm">
                  Atualize seu nome. Voce pode alterar ate 2 vezes por mes.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block dark:text-slate-300">
                  Nome
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full rounded-lg bg-white/85 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 text-slate-900 placeholder:text-slate-400 px-4 py-3 dark:bg-slate-900/50 dark:border-slate-700 dark:focus:border-emerald-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Seu nome"
                  maxLength={150}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block dark:text-slate-300">
                  Sobrenome
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full rounded-lg bg-white/85 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 text-slate-900 placeholder:text-slate-400 px-4 py-3 dark:bg-slate-900/50 dark:border-slate-700 dark:focus:border-emerald-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  placeholder="Seu sobrenome"
                  maxLength={150}
                  required
                />
              </div>
            </div>
          </div>

          {/* Mini-bio */}
          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Mini-bio
                </h2>
                <p className="text-muted text-sm">
                  Escreva um pouco sobre você e sua experiência musical.
                </p>
              </div>
            </div>
            <div>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={350}
                rows={4}
                placeholder="Conte um pouco sobre sua experiência musical..."
                className="w-full rounded-lg bg-white/85 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 text-slate-900 placeholder:text-slate-400 px-4 py-3 resize-none dark:bg-slate-900/50 dark:border-slate-700 dark:focus:border-emerald-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <p className="text-xs text-subtle mt-1">{bio.length}/350 caracteres</p>
            </div>
          </div>

          {/* Instrumentos */}
          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Music className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Instrumentos
                </h2>
                <p className="text-muted text-sm">
                  Selecione os instrumentos que você toca e defina o principal.
                </p>
              </div>
            </div>

            {loadingInstruments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableInstruments.map(inst => {
                    const isSelected = selectedInstruments.includes(inst.name);
                    const isPrimary = primaryInstrument === inst.name;
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => toggleInstrument(inst.name)}
                        className={`
                          flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all
                          ${
                            isSelected
                              ? isPrimary
                                ? 'border-emerald-400 bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200'
                                : 'border-sky-400 bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200'
                              : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800'
                          }
                        `}
                      >
                        <span
                          className={`
                            h-4 w-4 rounded border flex items-center justify-center text-xs
                            ${
                              isSelected
                                ? isPrimary
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'bg-sky-500 border-sky-500 text-white'
                                : 'border-slate-300 text-transparent dark:border-slate-500'
                            }
                          `}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{inst.display_name}</span>
                        {isPrimary && (
                          <span className="ml-auto text-xs bg-emerald-500/15 px-1.5 py-0.5 rounded text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-100">
                            Principal
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedInstruments.length > 0 && (
                  <>
                    <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
                      {selectedInstruments.length} instrumento{selectedInstruments.length > 1 ? 's' : ''} selecionado{selectedInstruments.length > 1 ? 's' : ''}
                    </p>
                    <div className="mt-4 rounded-lg border border-slate-200/70 bg-white/70 p-3 dark:border-slate-700/70 dark:bg-slate-900/60">
                      <label className="block text-xs font-medium text-slate-700 mb-2 dark:text-slate-300">
                        Instrumento principal
                      </label>
                      <select
                        value={primaryInstrument || ''}
                        onChange={e => handlePrimaryChange(e.target.value)}
                        className="w-full rounded-lg bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 text-slate-900 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:focus:border-emerald-400 dark:text-slate-100"
                      >
                        {selectedInstruments.map(inst => (
                          <option key={inst} value={inst}>
                            {getInstrumentDisplay(inst)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-subtle">
                        Este instrumento aparece como principal no seu perfil.
                      </p>
                    </div>
                  </>
                )}

                {selectedInstruments.length === 0 && (
                  <p className="mt-3 text-xs text-amber-400">
                    Selecione pelo menos um instrumento
                  </p>
                )}
              </>
            )}
          </div>

          {/* Gêneros Musicais */}
          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Disc3 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gêneros Musicais</h2>
                <p className="text-muted text-sm">
                  Selecione até 5 gêneros musicais que você mais toca.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {MUSICAL_GENRES.map(genre => (
                <button
                  key={genre.value}
                  type="button"
                  onClick={() => toggleGenre(genre.value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedGenres.includes(genre.value)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/70 text-slate-700 hover:bg-white border border-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-white/10'
                  }`}
                >
                  {genre.label}
                </button>
              ))}
            </div>
            {selectedGenres.length > 0 && (
              <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
                {selectedGenres.length} gênero{selectedGenres.length > 1 ? 's' : ''} selecionado{selectedGenres.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Cachê base */}
          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Coins className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cachê base</h2>
                <p className="text-muted text-sm">
                  Valor padrão para um show ou apresentação solo.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-slate-700 dark:text-slate-300">Cachê</span>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={baseFee}
                    onChange={handleCurrencyChange(setBaseFee)}
                    onBlur={handleCurrencyBlur(setBaseFee)}
                    placeholder="0,00"
                    className="w-full rounded-lg bg-white/85 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 text-slate-900 placeholder:text-slate-400 pl-9 pr-3 py-2 dark:bg-slate-900/50 dark:border-slate-700 dark:focus:border-emerald-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <p className="text-xs text-subtle mt-1">Formato: R$ 0,00</p>
              </label>
              <label className="block">
                <span className="text-sm text-slate-700 dark:text-slate-200">Valor por km (R$)</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-300">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={travelFee}
                      onChange={handleCurrencyChange(setTravelFee)}
                      onBlur={handleCurrencyBlur(setTravelFee)}
                      placeholder="0,00"
                      className="w-full rounded-lg bg-white/85 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 text-slate-900 placeholder:text-slate-400 pl-9 pr-3 py-2 dark:bg-slate-900/50 dark:border-slate-700 dark:focus:border-emerald-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <CarFront className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                </div>
                <p className="text-xs text-subtle mt-1">Use vírgula para centavos (ex: 1,50).</p>
              </label>
            </div>
          </div>

          {/* Equipamentos */}
          <div className="surface-card rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pacotes de equipamentos</h2>
                  <p className="text-muted text-sm">
                    Liste os recursos que você leva (som, mesa, microfones, luz, etc) e seus
                    valores.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddEquipment}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors dark:text-emerald-200"
              >
                <Plus className="h-4 w-4" />
                Adicionar item
              </button>
            </div>

            <div className="space-y-3">
              {equipmentRows.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white/70 border border-slate-200/70 rounded-lg p-3 dark:bg-slate-900/50 dark:border-slate-700/60"
                >
                  <div className="sm:col-span-7">
                    <label className="text-sm text-slate-700 dark:text-slate-200">Equipamento/serviço</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleEquipmentChange(index, 'name', e.target.value)}
                      placeholder="Ex: Som completo"
                      className="mt-1 w-full rounded-lg bg-white/85 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 text-slate-900 placeholder:text-slate-400 px-3 py-2 dark:bg-slate-900/50 dark:border-slate-700 dark:focus:border-emerald-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="text-sm text-slate-700 dark:text-slate-200">Valor (R$)</label>
                    <div className="mt-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-300">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.price}
                        onChange={e =>
                          handleEquipmentChange(index, 'price', maskCurrencyInput(e.target.value))
                        }
                        onBlur={e =>
                          handleEquipmentChange(index, 'price', formatCurrencyMask(e.target.value))
                        }
                        placeholder="0,00"
                        className="w-full rounded-lg bg-white/85 border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 text-slate-900 placeholder:text-slate-400 pl-9 pr-3 py-2 dark:bg-slate-900/50 dark:border-slate-700 dark:focus:border-emerald-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipment(index)}
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-white/80 border border-slate-200 text-slate-600 hover:bg-red-500/10 hover:text-red-700 transition-colors px-3 py-2 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-red-500/20 dark:hover:text-red-200"
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {equipmentRows.length === 0 && (
                <p className="text-sm text-muted">
                  Adicione itens para ofertar seus equipamentos.
                </p>
              )}
            </div>
          </div>

          {/* Resumo */}
          <div className="surface-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Resumo rápido</h3>
              <p className="text-muted text-sm">
                Estas informações ajudam o contratante a entender seu pacote completo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100">
                Cachê: {formatCurrency(parseDecimal(baseFee))}
              </div>
              <div className="px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-500/20 text-sky-900 dark:text-sky-100">
                Km: {formatCurrency(parseDecimal(travelFee))}
              </div>
              <div className="px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-900 dark:text-indigo-100">
                {equipmentRows.filter(i => i.name.trim()).length} itens
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar valores
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default FinancialSettings;
