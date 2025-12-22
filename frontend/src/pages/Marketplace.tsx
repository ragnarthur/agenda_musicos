import React, { useEffect, useState } from 'react';
import { Megaphone, MapPin, Calendar as CalendarIcon, Phone, Mail, Send, Sparkles, Clock3 } from 'lucide-react';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import { marketplaceService } from '../services/api';
import type { MarketplaceGig, MarketplaceApplication } from '../types';

const statusStyles: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  in_review: 'bg-amber-100 text-amber-800',
  hired: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-rose-100 text-rose-700',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-rose-100 text-rose-700',
};

const statusLabel: Record<string, string> = {
  open: 'Aberta',
  in_review: 'Em avaliação',
  hired: 'Contratada',
  closed: 'Encerrada',
  cancelled: 'Cancelada',
  pending: 'Pendente',
  rejected: 'Recusada',
};

type ApplyForm = { cover_letter: string; expected_fee: string };
type CityOption = { id: number; name: string; state: string };

const Marketplace: React.FC = () => {
  const [gigs, setGigs] = useState<MarketplaceGig[]>([]);
  const [myApplications, setMyApplications] = useState<MarketplaceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    location: '',
    event_date: '',
    start_time: '',
    end_time: '',
    budget: '',
    genres: '',
    contact_phone: '',
  });
  const [applyForms, setApplyForms] = useState<Record<number, ApplyForm>>({});
  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityFeedback, setCityFeedback] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [gigsData, myApplicationsData] = await Promise.all([
        marketplaceService.getGigs(),
        marketplaceService.getMyApplications(),
      ]);
      setGigs(gigsData);
      setMyApplications(myApplicationsData);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar o marketplace. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGig = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Informe um título para a vaga.');
      return;
    }

    try {
      setCreating(true);
      await marketplaceService.createGig(form);
      setForm({
        title: '',
        description: '',
        city: '',
        location: '',
        event_date: '',
        start_time: '',
        end_time: '',
        budget: '',
        genres: '',
        contact_phone: '',
      });
      setCityQuery('');
      setCityOptions([]);
      setCityFeedback('');
      setCityOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Não foi possível criar a vaga. Verifique os campos e tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  const handleApplyChange = (gigId: number, field: keyof ApplyForm, value: string) => {
    setApplyForms((prev) => ({
      ...prev,
      [gigId]: {
        cover_letter: prev[gigId]?.cover_letter || '',
        expected_fee: prev[gigId]?.expected_fee || '',
        [field]: value,
      },
    }));
  };

  const handleApply = async (gigId: number) => {
    const payload = applyForms[gigId] || { cover_letter: '', expected_fee: '' };
    try {
      await marketplaceService.applyToGig(gigId, payload);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Não foi possível enviar sua candidatura. Tente novamente.');
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'Data a combinar';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
  };

  const formatCurrency = (value?: string | number | null) => {
    if (!value) return 'A combinar';
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) return 'A combinar';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatTime = (value?: string | null) => {
    if (!value) return null;
    return value.slice(0, 5);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    const area = digits.slice(0, 2);
    const mid = digits.slice(2, 7);
    const end = digits.slice(7);
    return end ? `(${area}) ${mid}-${end}` : `(${area}) ${digits.slice(2)}`;
  };

  useEffect(() => {
    if (!cityOpen) return undefined;

    const query = cityQuery.trim();
    if (query.length < 3) {
      setCityOptions([]);
      setCityLoading(false);
      setCityFeedback('Digite ao menos 3 letras para buscar');
      return undefined;
    }

    const controller = new AbortController();
    setCityLoading(true);
    setCityFeedback('');

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://brasilapi.com.br/api/cptec/v1/cidade/${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error('Falha ao buscar cidades');
        }
        const data = await response.json();
        const options = Array.isArray(data)
          ? data.map((item) => ({
              id: item.id,
              name: item.nome,
              state: item.estado,
            }))
          : [];
        setCityOptions(options.slice(0, 8));
        if (options.length === 0) {
          setCityFeedback('Nenhuma cidade encontrada');
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setCityOptions([]);
        setCityFeedback('Não foi possível carregar cidades');
      } finally {
        setCityLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [cityQuery, cityOpen]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="hero-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary-100/70 flex items-center justify-center shadow-inner">
                <Megaphone className="h-6 w-6 text-primary-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Marketplace de Gigs</h1>
                <p className="text-sm text-gray-600">
                  Publique vagas e concorra a shows como freelancer. Encontre músicos prontos para tocar.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Sparkles className="h-4 w-4 text-primary-600" />
              <span>Talentos e oportunidades reunidos em um só lugar</span>
            </div>
          </div>
        </div>

        {loading ? (
          <Loading text="Carregando marketplace..." />
        ) : error ? (
          <div className="card-contrast bg-red-50/80 border-red-200">
            <p className="text-red-800 mb-3">{error}</p>
            <button className="btn-primary" onClick={loadData}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {gigs.length === 0 ? (
                <div className="card-contrast">
                  <p className="text-gray-700">Nenhuma vaga aberta ainda. Publique a primeira oportunidade!</p>
                </div>
              ) : (
                gigs.map((gig) => {
                  const applyForm = applyForms[gig.id] || { cover_letter: '', expected_fee: '' };
                  const canApply = gig.status === 'open' || gig.status === 'in_review';

                  return (
                    <div key={gig.id} className="card-contrast hover:shadow-2xl transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-500">{gig.created_by_name || 'Cliente'}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[gig.status] || 'bg-gray-100 text-gray-700'}`}>
                              {statusLabel[gig.status] || gig.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mt-1">{gig.title}</h3>
                          {gig.description && <p className="text-sm text-gray-700 mt-1">{gig.description}</p>}
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <p className="font-semibold text-gray-900">{formatCurrency(gig.budget)}</p>
                          <p>Candidaturas: {gig.applications_count}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary-600" />
                          <span>{gig.city || 'Cidade a combinar'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-primary-600" />
                          <span>{formatDate(gig.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-primary-600" />
                          <span>
                            {formatTime(gig.start_time)
                              ? `${formatTime(gig.start_time)}${formatTime(gig.end_time) ? ` - ${formatTime(gig.end_time)}` : ''}`
                              : 'Horário a combinar'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary-600" />
                          <span>{gig.genres || 'Estilos livres'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary-600" />
                          <span>{gig.contact_phone || 'Telefone a combinar'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary-600" />
                          <span>{gig.contact_email || 'Email a combinar'}</span>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-gray-100 pt-3 space-y-3">
                        {gig.my_application ? (
                          <div className="flex items-center justify-between bg-primary-50 border border-primary-100 rounded-lg p-3 text-sm">
                            <div>
                              <p className="text-primary-800 font-semibold">Você já se candidatou</p>
                              <p className="text-primary-700">
                                Status: {statusLabel[gig.my_application.status] || gig.my_application.status}
                              </p>
                            </div>
                            <div className="text-right text-xs text-gray-600">
                              {gig.my_application.expected_fee && (
                                <p>Cache: {formatCurrency(gig.my_application.expected_fee)}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                              placeholder="Mensagem curta (repertório, disponibilidade, diferencial)"
                              value={applyForm.cover_letter}
                              onChange={(e) => handleApplyChange(gig.id, 'cover_letter', e.target.value)}
                              disabled={!canApply}
                            />
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 flex-1"
                                placeholder="Cache desejado (opcional)"
                                value={applyForm.expected_fee}
                                onChange={(e) => handleApplyChange(gig.id, 'expected_fee', e.target.value)}
                                disabled={!canApply}
                              />
                              <button
                                className="btn-primary flex items-center gap-1"
                                onClick={() => handleApply(gig.id)}
                                disabled={!canApply}
                              >
                                <Send className="h-4 w-4" />
                                Candidatar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-4">
              <div className="card-contrast border-primary-200/70">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Publicar vaga rápida</h3>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreateGig}>
                  <input
                    type="text"
                    className="input-field sm:col-span-2"
                    placeholder="Título da vaga (ex: Voz e violão - casamento)"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                  <textarea
                    className="input-field sm:col-span-2 min-h-[96px] resize-y"
                    placeholder="Descrição (repertório, duração, observações)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                  />
                  <div className="relative sm:col-span-2">
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Cidade/UF"
                      value={cityQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCityQuery(value);
                        setForm((prev) => ({ ...prev, city: value }));
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
                          <div className="px-3 py-2 text-sm text-gray-500">Buscando cidades...</div>
                        )}
                        {!cityLoading && cityOptions.length > 0 && (
                          <div className="py-1">
                            {cityOptions.map((city) => {
                              const label = `${city.name}/${city.state}`;
                              return (
                                <button
                                  key={city.id}
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    setCityQuery(label);
                                    setForm((prev) => ({ ...prev, city: label }));
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
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Local (bar, salão...)"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                  <input
                    type="date"
                    className="input-field py-3 text-sm sm:text-base"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="time"
                      className="input-field py-3 text-sm sm:text-base"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    />
                    <input
                      type="time"
                      className="input-field py-3 text-sm sm:text-base"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    />
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Cache (ex: 1500)"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Estilos (pop, rock, sertanejo)"
                    value={form.genres}
                    onChange={(e) => setForm({ ...form, genres: e.target.value })}
                  />
                  <input
                    type="text"
                    className="input-field sm:col-span-2"
                    placeholder="Telefone/WhatsApp"
                    value={form.contact_phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setForm((prev) => ({ ...prev, contact_phone: formatted }));
                    }}
                    inputMode="tel"
                    maxLength={15}
                  />
                  <button
                    type="submit"
                    className="btn-primary w-full flex items-center justify-center gap-2 sm:col-span-2"
                    disabled={creating}
                  >
                    <Megaphone className="h-4 w-4" />
                    {creating ? 'Publicando...' : 'Publicar vaga'}
                  </button>
                </form>
              </div>

              <div className="card-contrast">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Minhas candidaturas</h3>
                {Array.isArray(myApplications) && myApplications.length === 0 ? (
                  <p className="text-sm text-gray-600">Você ainda não se candidatou em nenhuma vaga.</p>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(myApplications) ? myApplications : []).map((app) => (
                      <div key={app.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 truncate">{gigs.find((g) => g.id === app.gig)?.title || 'Vaga'}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[app.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabel[app.status] || app.status}
                          </span>
                        </div>
                        {app.expected_fee && (
                          <p className="text-sm text-gray-700 mt-1">Cache proposto: {formatCurrency(app.expected_fee)}</p>
                        )}
                        {app.cover_letter && <p className="text-xs text-gray-500 mt-1">{app.cover_letter}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Marketplace;
