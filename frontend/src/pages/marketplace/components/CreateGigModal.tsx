import React from 'react';
import { Loader2, Megaphone, PencilLine, X } from 'lucide-react';
import type { MarketplaceGig } from '../../../types';
import { getMobileInputProps } from '../../../utils/mobileInputs';
import { DURATION_PRESETS } from '../types';
import { formatCurrencyInput, formatPhone } from '../utils';

type CityOption = { id: number; name: string; state: string };

type GigForm = {
  title: string;
  description: string;
  city: string;
  location: string;
  event_date: string;
  start_time: string;
  end_time: string;
  budget: string;
  genres: string;
  contact_phone: string;
};

interface CreateGigModalProps {
  open: boolean;
  editingGig: MarketplaceGig | null;
  form: GigForm;
  setForm: React.Dispatch<React.SetStateAction<GigForm>>;
  creating: boolean;
  cityQuery: string;
  setCityQuery: (v: string) => void;
  cityOptions: CityOption[];
  cityOpen: boolean;
  setCityOpen: (v: boolean) => void;
  cityLoading: boolean;
  cityFeedback: string;
  duration: string;
  setDuration: (v: string) => void;
  customDuration: string;
  setCustomDuration: (v: string) => void;
  setCustomDurationActive: (v: boolean) => void;
  isCustomDuration: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function CreateGigModal({
  open,
  editingGig,
  form,
  setForm,
  creating,
  cityQuery,
  setCityQuery,
  cityOptions,
  cityOpen,
  setCityOpen,
  cityLoading,
  cityFeedback,
  duration,
  setDuration,
  customDuration,
  setCustomDuration,
  setCustomDurationActive,
  isCustomDuration,
  onSubmit,
  onClose,
}: CreateGigModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-start sm:items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90svh] overflow-y-auto"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {editingGig ? 'Editar oportunidade' : 'Nova oportunidade'}
            </h3>
            <p className="text-sm text-gray-600">
              {editingGig
                ? 'Atualize os detalhes da oportunidade publicada.'
                : 'Preencha os detalhes para divulgar sua oportunidade.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 hover:text-gray-700 hover:border-gray-300"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Título da vaga</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Voz e violão - casamento"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
            <textarea
              className="input-field min-h-[120px] resize-y"
              placeholder="Repertório, duração, observações"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="relative sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cidade/UF</label>
            <input
              type="text"
              className="input-field"
              placeholder="Digite para buscar"
              value={cityQuery}
              onChange={e => {
                const value = e.target.value;
                setCityQuery(value);
                setForm(prev => ({ ...prev, city: value }));
                setCityOpen(true);
              }}
              onFocus={() => setCityOpen(true)}
              onBlur={() => {
                setTimeout(() => setCityOpen(false), 150);
              }}
              autoComplete="off"
            />
            {cityOpen && (
              <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
                {cityLoading && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando cidades...
                  </div>
                )}
                {!cityLoading && cityOptions.length > 0 && (
                  <div className="py-1">
                    {cityOptions.map(city => {
                      const label = `${city.name}/${city.state}`;
                      return (
                        <button
                          key={city.id}
                          type="button"
                          onMouseDown={event => {
                            event.preventDefault();
                            setCityQuery(label);
                            setForm(prev => ({ ...prev, city: label }));
                            setCityOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!cityLoading && cityOptions.length === 0 && cityFeedback && (
                  <div className="px-3 py-2 text-sm text-gray-500">{cityFeedback}</div>
                )}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Local</label>
            <input
              type="text"
              className="input-field"
              placeholder="Bar, salão, igreja..."
              value={form.location}
              onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2">
            <p className="block text-sm font-medium text-gray-700 mb-2">Data e horário</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Data</label>
                <input
                  type="date"
                  className="input-field h-12 text-sm sm:text-base"
                  value={form.event_date}
                  onChange={e => setForm(prev => ({ ...prev, event_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Início</label>
                <input
                  type="time"
                  className="input-field h-12 text-sm sm:text-base"
                  value={form.start_time}
                  onChange={e => setForm(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fim</label>
                <input
                  type="time"
                  className="input-field h-12 text-sm sm:text-base"
                  value={form.end_time}
                  onChange={e => setForm(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className={isCustomDuration ? 'sm:col-span-2' : 'sm:col-span-3'}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Duração (opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '1h', value: '1' },
                    { label: '2h', value: '2' },
                    { label: '3h', value: '3' },
                    { label: '4h', value: '4' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setDuration(option.value);
                        setCustomDurationActive(false);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        duration === option.value
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDurationActive(true);
                      if (customDuration) {
                        setDuration(customDuration);
                      } else if (DURATION_PRESETS.includes(duration)) {
                        setDuration('');
                      }
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      isCustomDuration
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-200'
                    }`}
                  >
                    Outro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDuration('');
                      setCustomDuration('');
                      setCustomDurationActive(false);
                    }}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              {isCustomDuration ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Outro</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    className="input-field h-12 text-sm sm:text-base"
                    placeholder="Horas"
                    value={customDuration}
                    onChange={e => {
                      setCustomDuration(e.target.value);
                      setDuration(e.target.value);
                      setCustomDurationActive(true);
                    }}
                  />
                </div>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Se ainda não houver data ou horário definidos, deixe em branco.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cache</label>
            <input
              type="text"
              className="input-field"
              placeholder="R$ 0,00"
              value={form.budget}
              onChange={e => {
                const formatted = formatCurrencyInput(e.target.value);
                setForm(prev => ({ ...prev, budget: formatted }));
              }}
              {...getMobileInputProps('number')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estilos</label>
            <input
              type="text"
              className="input-field"
              placeholder="Pop, rock, sertanejo"
              value={form.genres}
              onChange={e => setForm(prev => ({ ...prev, genres: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone/WhatsApp
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="(11) 98888-8888"
              value={form.contact_phone}
              onChange={e => {
                const formatted = formatPhone(e.target.value);
                setForm(prev => ({ ...prev, contact_phone: formatted }));
              }}
              maxLength={15}
              {...getMobileInputProps('tel')}
            />
          </div>

          <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={onClose} className="btn-secondary w-full">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={creating}
            >
              {creating ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : editingGig ? (
                <PencilLine className="h-4 w-4" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
              {creating
                ? editingGig
                  ? 'Salvando...'
                  : 'Publicando...'
                : editingGig
                  ? 'Salvar alterações'
                  : 'Publicar oportunidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
