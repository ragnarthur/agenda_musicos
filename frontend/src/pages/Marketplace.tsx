import React, { useCallback, useEffect, useState } from 'react';
import {
  Megaphone,
  MapPin,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  Send,
  Sparkles,
  Clock3,
  Loader2,
  X,
  PencilLine,
  Trash2,
  ArrowUp,
} from 'lucide-react';
import Layout from '../components/Layout/Layout';
import { SkeletonCard } from '../components/common/Skeleton';
import PullToRefresh from '../components/common/PullToRefresh';
import ConfirmModal from '../components/modals/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { marketplaceService } from '../services/api';
import type { MarketplaceGig, MarketplaceApplication } from '../types';
import { logError } from '../utils/logger';
import { sanitizeOptionalText, sanitizeText } from '../utils/sanitize';
import { getErrorMessage } from '../utils/toast';
import { getMobileInputProps } from '../utils/mobileInputs';

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
const DURATION_PRESETS = ['1', '2', '3', '4'];

const Marketplace: React.FC = () => {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<MarketplaceGig[]>([]);
  const [myApplications, setMyApplications] = useState<MarketplaceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useBodyScrollLock(showCreateModal);
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
  const [editingGig, setEditingGig] = useState<MarketplaceGig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketplaceGig | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityFeedback, setCityFeedback] = useState('');
  const [duration, setDuration] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [customDurationActive, setCustomDurationActive] = useState(false);
  const isCustomDuration =
    customDurationActive || (duration !== '' && !DURATION_PRESETS.includes(duration));

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
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, []);

  const handleSubmitGig = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Informe um título para a vaga.');
      return;
    }

    try {
      setCreating(true);
      const payload = {
        ...form,
        title: sanitizeText(form.title, 200),
        description: sanitizeOptionalText(form.description, 5000),
        city: sanitizeOptionalText(form.city, 100),
        location: sanitizeOptionalText(form.location, 200),
        genres: sanitizeOptionalText(form.genres, 120),
        contact_phone: sanitizeOptionalText(form.contact_phone, 30),
        budget: normalizeCurrency(form.budget),
      };
      if (editingGig) {
        await marketplaceService.updateGig(editingGig.id, payload);
      } else {
        await marketplaceService.createGig(payload);
      }
      resetForm();
      setEditingGig(null);
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleApplyChange = (gigId: number, field: keyof ApplyForm, value: string) => {
    const nextValue = field === 'expected_fee' ? formatCurrencyInput(value) : value;
    setApplyForms(prev => ({
      ...prev,
      [gigId]: {
        cover_letter: prev[gigId]?.cover_letter || '',
        expected_fee: prev[gigId]?.expected_fee || '',
        [field]: nextValue,
      },
    }));
  };

  const handleApply = async (gigId: number) => {
    const payload = applyForms[gigId] || { cover_letter: '', expected_fee: '' };
    try {
      await marketplaceService.applyToGig(gigId, {
        ...payload,
        cover_letter: sanitizeOptionalText(payload.cover_letter, 2000) || '',
        expected_fee: normalizeCurrency(payload.expected_fee),
      });
      await loadData();
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'Data a combinar';
    const [year, month, day] = value.split('T')[0].split('-').map(Number);
    if (!year || !month || !day) return 'Data a combinar';
    const localDate = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(localDate);
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

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const amount = Number(digits) / 100;
    return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const normalizeCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return undefined;
    return (Number(digits) / 100).toFixed(2);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    const area = digits.slice(0, 2);
    const mid = digits.slice(2, 7);
    const end = digits.slice(7);
    return end ? `(${area}) ${mid}-${end}` : `(${area}) ${digits.slice(2)}`;
  };

  const resetForm = useCallback(() => {
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
    setDuration('');
    setCustomDuration('');
    setCustomDurationActive(false);
  }, []);

  const openCreateModal = () => {
    setEditingGig(null);
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (gig: MarketplaceGig) => {
    setEditingGig(gig);
    setForm({
      title: gig.title || '',
      description: gig.description || '',
      city: gig.city || '',
      location: gig.location || '',
      event_date: gig.event_date || '',
      start_time: gig.start_time ? gig.start_time.slice(0, 5) : '',
      end_time: gig.end_time ? gig.end_time.slice(0, 5) : '',
      budget: gig.budget ? formatCurrencyInput(String(gig.budget)) : '',
      genres: gig.genres || '',
      contact_phone: gig.contact_phone || '',
    });
    setCityQuery(gig.city || '');
    setCityOptions([]);
    setCityFeedback('');
    setCityOpen(false);
    setDuration('');
    setCustomDuration('');
    setCustomDurationActive(false);
    setShowCreateModal(true);
  };

  const closeModal = useCallback(() => {
    setShowCreateModal(false);
    setEditingGig(null);
    resetForm();
  }, [resetForm]);

  const handleDeleteGig = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await marketplaceService.deleteGig(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const scrollToGig = (gigId: number) => {
    const target = document.getElementById(`gig-${gigId}`);
    if (target) {
      const offset = 96;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          ? data.map(item => ({
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

  useEffect(() => {
    if (!showCreateModal) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal, closeModal]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 320);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!form.start_time || !duration) return;
    const hours = Number(duration);
    if (!Number.isFinite(hours) || hours <= 0) return;
    const [h, m] = form.start_time.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;
    const total = h * 60 + m + hours * 60;
    const nextMinutes = total % (24 * 60);
    const endH = Math.floor(nextMinutes / 60);
    const endM = nextMinutes % 60;
    const endValue = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    setForm(prev => ({ ...prev, end_time: endValue }));
  }, [duration, form.start_time]);

  useEffect(() => {
    if (!duration || DURATION_PRESETS.includes(duration)) return;
    if (!customDurationActive) {
      setCustomDurationActive(true);
    }
    if (customDuration !== duration) {
      setCustomDuration(duration);
    }
  }, [duration, customDuration, customDurationActive]);

  const myGigs = gigs.filter(gig => gig.created_by === user?.user.id);

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
      <div className="page-stack">
        <div id="vagas-hero" className="hero-panel scroll-mt-24">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary-100/70 flex items-center justify-center shadow-inner">
                <Megaphone className="h-6 w-6 text-primary-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vagas de Shows</h1>
                <p className="text-sm text-gray-600">
                  Publique oportunidades, acompanhe candidaturas e feche shows com músicos
                  profissionais.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Sparkles className="h-4 w-4 text-primary-600" />
              <span>Gestão de vagas e candidaturas em um só lugar</span>
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonCard count={3} />
        ) : error ? (
          <div className="card-contrast bg-red-50/80 border-red-200">
            <p className="text-red-800 mb-3">{error}</p>
            <button className="btn-primary" onClick={loadData}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4">
              {gigs.length === 0 ? (
                <div className="card-contrast">
                  <p className="text-gray-700">Não há oportunidades ativas. Publique a primeira.</p>
                </div>
              ) : (
                gigs.map(gig => {
                  const applyForm = applyForms[gig.id] || { cover_letter: '', expected_fee: '' };
                  const canApply = gig.status === 'open' || gig.status === 'in_review';
                  const isOwner = gig.created_by ? gig.created_by === user?.user.id : false;

                  return (
                    <div
                      id={`gig-${gig.id}`}
                      key={gig.id}
                      className="card-contrast hover:shadow-2xl transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-500">
                              {gig.created_by_name || 'Cliente'}
                            </p>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[gig.status] || 'bg-gray-100 text-gray-700'}`}
                            >
                              {statusLabel[gig.status] || gig.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mt-1">{gig.title}</h3>
                          {gig.description && (
                            <p className="text-sm text-gray-700 mt-1">{gig.description}</p>
                          )}
                        </div>
                        <div className="text-left sm:text-right text-sm text-gray-600 space-y-2">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(gig.budget)}
                          </p>
                          <p>Candidaturas: {gig.applications_count}</p>
                          {isOwner ? (
                            <div className="flex flex-wrap gap-2 sm:justify-end">
                              <button
                                type="button"
                                onClick={() => openEditModal(gig)}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-primary-200 hover:text-primary-700 transition-colors"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(gig)}
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 hover:text-red-700 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                              </button>
                            </div>
                          ) : null}
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
                        {isOwner ? (
                          <div className="rounded-lg border border-primary-200 bg-gradient-to-r from-primary-100 via-white to-primary-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 px-3 py-2 text-sm text-primary-900 shadow-sm">
                            <span className="animate-pulse font-semibold tracking-wide">
                              Você publicou esta vaga.
                            </span>
                          </div>
                        ) : gig.my_application ? (
                          <div className="flex items-center justify-between bg-primary-50 border border-primary-100 rounded-lg p-3 text-sm">
                            <div>
                              <p className="text-primary-800 font-semibold">
                                Você já se candidatou
                              </p>
                              <p className="text-primary-700">
                                Status:{' '}
                                {statusLabel[gig.my_application.status] ||
                                  gig.my_application.status}
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
                              className="input-field"
                              placeholder="Mensagem curta (repertório, disponibilidade, diferencial)"
                              value={applyForm.cover_letter}
                              onChange={e =>
                                handleApplyChange(gig.id, 'cover_letter', e.target.value)
                              }
                              disabled={!canApply}
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <input
                                type="text"
                                className="input-field w-full sm:flex-1"
                                placeholder="R$ 0,00"
                                value={applyForm.expected_fee}
                                onChange={e =>
                                  handleApplyChange(gig.id, 'expected_fee', e.target.value)
                                }
                                inputMode="decimal"
                                disabled={!canApply}
                              />
                              <button
                                className="btn-primary w-full sm:w-auto flex items-center justify-center gap-1"
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cadastrar oportunidade</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Cadastre uma nova oportunidade em poucos passos.
                </p>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Megaphone className="h-4 w-4" />
                  Nova oportunidade
                </button>
              </div>

              <div className="card-contrast">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Minhas vagas</h3>
                  {showBackToTop ? (
                    <button
                      type="button"
                      onClick={scrollToHero}
                      className="text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors"
                    >
                      Voltar ao topo
                    </button>
                  ) : null}
                </div>
                {myGigs.length === 0 ? (
                  <p className="text-sm text-gray-600">Você ainda não publicou nenhuma vaga.</p>
                ) : (
                  <div className="space-y-3">
                    {myGigs.map(gig => (
                      <button
                        key={gig.id}
                        type="button"
                        onClick={() => scrollToGig(gig.id)}
                        className="w-full text-left border border-gray-100 rounded-lg p-3 transition hover:border-primary-200 hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900 truncate">{gig.title}</p>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[gig.status] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {statusLabel[gig.status] || gig.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                          <span>{gig.city || 'Cidade a combinar'}</span>
                          <span>•</span>
                          <span>{formatDate(gig.event_date)}</span>
                          <span>•</span>
                          <span>Candidaturas: {gig.applications_count}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-contrast">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Minhas candidaturas</h3>
                {Array.isArray(myApplications) && myApplications.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Você ainda não se candidatou em nenhuma vaga.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(myApplications) ? myApplications : []).map(app => (
                      <div key={app.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 truncate">
                            {gigs.find(g => g.id === app.gig)?.title || 'Vaga'}
                          </p>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[app.status] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {statusLabel[app.status] || app.status}
                          </span>
                        </div>
                        {app.expected_fee && (
                          <p className="text-sm text-gray-700 mt-1">
                            Cache proposto: {formatCurrency(app.expected_fee)}
                          </p>
                        )}
                        {app.cover_letter && (
                          <p className="text-xs text-gray-500 mt-1">{app.cover_letter}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-start sm:items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
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
                onClick={closeModal}
                className="rounded-full border border-gray-200 p-2 text-gray-500 hover:text-gray-700 hover:border-gray-300"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmitGig}>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título da vaga
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Voz e violão - casamento"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <textarea
                  className="input-field min-h-[120px] resize-y"
                  placeholder="Repertório, duração, observações"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
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
                  onChange={e => setForm({ ...form, location: e.target.value })}
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
                      onChange={e => setForm({ ...form, event_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Início</label>
                    <input
                      type="time"
                      className="input-field h-12 text-sm sm:text-base"
                      value={form.start_time}
                      onChange={e => setForm({ ...form, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Fim</label>
                    <input
                      type="time"
                      className="input-field h-12 text-sm sm:text-base"
                      value={form.end_time}
                      onChange={e => setForm({ ...form, end_time: e.target.value })}
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
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Outro
                      </label>
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
                    setForm({ ...form, budget: formatted });
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
                  onChange={e => setForm({ ...form, genres: e.target.value })}
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
                <button type="button" onClick={closeModal} className="btn-secondary w-full">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={creating}
                >
                  {editingGig ? (
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
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteGig}
        title="Excluir oportunidade"
        message="Tem certeza que deseja excluir esta oportunidade? Essa ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={deleteLoading}
        icon={<Trash2 className="h-5 w-5" />}
      />

      {showBackToTop && !showCreateModal ? (
        <button
          type="button"
          onClick={scrollToHero}
          className="fixed bottom-5 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-primary-700"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-4 w-4" />
          Voltar ao topo
        </button>
      ) : null}
      </PullToRefresh>
    </Layout>
  );
};

export default Marketplace;
