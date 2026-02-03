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
  const [bio, setBio] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [travelFee, setTravelFee] = useState('');
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>(DEFAULT_EQUIPMENTS);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [primaryInstrument, setPrimaryInstrument] = useState('');

  const hydrateForm = useCallback((musician: Musician) => {
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

  const getInstrumentDisplay = (instrumentName: string) => {
    const match = availableInstruments.find(inst => inst.name === instrumentName);
    return match?.display_name || formatInstrumentLabel(instrumentName);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const mainInstrument = primaryInstrument || selectedInstruments[0] || '';
    const orderedInstruments = mainInstrument
      ? [mainInstrument, ...selectedInstruments.filter(inst => inst !== mainInstrument)]
      : selectedInstruments;
    const payload: MusicianUpdatePayload = {
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
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-200">
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
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-3"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Wallet className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Valores & Serviços
                </h1>
                <p className="text-slate-300">
                  Cadastre seu cachê, taxas por deslocamento e pacotes de equipamentos.
                </p>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            <span>Informações visíveis nos convites</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mini-bio */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/60 p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">Mini-bio</h2>
                <p className="text-slate-300 text-sm">
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
                className="w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 text-slate-100 placeholder:text-slate-500 px-4 py-3 resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">{bio.length}/350 caracteres</p>
            </div>
          </div>

          {/* Instrumentos */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/60 p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Music className="h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">Instrumentos</h2>
                <p className="text-slate-300 text-sm">
                  Selecione os instrumentos que você toca e defina o principal.
                </p>
              </div>
            </div>

            {loadingInstruments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
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
                                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                                : 'border-sky-400 bg-sky-500/20 text-sky-200'
                              : 'border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
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
                                : 'border-slate-500 text-transparent'
                            }
                          `}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{inst.display_name}</span>
                        {isPrimary && (
                          <span className="ml-auto text-xs bg-emerald-500/30 px-1.5 py-0.5 rounded">
                            Principal
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedInstruments.length > 0 && (
                  <>
                    <p className="mt-3 text-xs text-emerald-400">
                      {selectedInstruments.length} instrumento{selectedInstruments.length > 1 ? 's' : ''} selecionado{selectedInstruments.length > 1 ? 's' : ''}
                    </p>
                    <div className="mt-4 rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">
                      <label className="block text-xs font-medium text-slate-300 mb-2">
                        Instrumento principal
                      </label>
                      <select
                        value={primaryInstrument || ''}
                        onChange={e => handlePrimaryChange(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 text-slate-100 px-3 py-2 text-sm"
                      >
                        {selectedInstruments.map(inst => (
                          <option key={inst} value={inst}>
                            {getInstrumentDisplay(inst)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-400">
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

          {/* Cachê base */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/60 p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Coins className="h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">Cachê base</h2>
                <p className="text-slate-300 text-sm">
                  Valor padrão para um show ou apresentação solo.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-slate-300">Cachê</span>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={baseFee}
                    onChange={handleCurrencyChange(setBaseFee)}
                    onBlur={handleCurrencyBlur(setBaseFee)}
                    placeholder="0,00"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 text-slate-100 placeholder:text-slate-500 px-8 py-2"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Formato: R$ 0,00</p>
              </label>
              <label className="block">
                <span className="text-sm text-slate-200">Valor por km (R$)</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-300">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={travelFee}
                      onChange={handleCurrencyChange(setTravelFee)}
                      onBlur={handleCurrencyBlur(setTravelFee)}
                      placeholder="0,00"
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 text-slate-100 placeholder:text-slate-500 px-8 py-2"
                    />
                  </div>
                  <CarFront className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 mt-1">Use vírgula para centavos (ex: 1,50).</p>
              </label>
            </div>
          </div>

          {/* Equipamentos */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/60 p-5 shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-emerald-300" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Pacotes de equipamentos</h2>
                  <p className="text-slate-300 text-sm">
                    Liste os recursos que você leva (som, mesa, microfones, luz, etc) e seus
                    valores.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddEquipment}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Adicionar item
              </button>
            </div>

            <div className="space-y-3">
              {equipmentRows.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-900/50 border border-slate-700/60 rounded-lg p-3"
                >
                  <div className="sm:col-span-7">
                    <label className="text-sm text-slate-200">Equipamento/serviço</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleEquipmentChange(index, 'name', e.target.value)}
                      placeholder="Ex: Som completo"
                      className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 text-slate-100 placeholder:text-slate-500 px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="text-sm text-slate-200">Valor (R$)</label>
                    <div className="mt-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-300">
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
                        className="w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 text-slate-100 placeholder:text-slate-500 px-8 py-2"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipment(index)}
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-red-500/20 hover:text-red-200 transition-colors px-3 py-2"
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {equipmentRows.length === 0 && (
                <p className="text-sm text-slate-300">
                  Adicione itens para ofertar seus equipamentos.
                </p>
              )}
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Resumo rápido</h3>
              <p className="text-slate-300 text-sm">
                Estas informações ajudam o contratante a entender seu pacote completo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-100">
                Cachê: {formatCurrency(parseDecimal(baseFee))}
              </div>
              <div className="px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-500/20 text-sky-100">
                Km: {formatCurrency(parseDecimal(travelFee))}
              </div>
              <div className="px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-100">
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
