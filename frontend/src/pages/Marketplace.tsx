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
  CheckCircle2,
  Users,
  Ban,
  MessageCircle,
  Eraser,
} from 'lucide-react';
import Layout from '../components/Layout/Layout';
import { SkeletonCard } from '../components/common/Skeleton';
import PullToRefresh from '../components/common/PullToRefresh';
import ConfirmModal from '../components/modals/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { marketplaceService } from '../services/api';
import type { MarketplaceGig, MarketplaceApplication, MarketplaceGigChatMessage } from '../types';
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
type CloseStatus = 'closed' | 'cancelled';
type CloseTarget = { gig: MarketplaceGig; status: CloseStatus } | null;
type HireTarget = { gig: MarketplaceGig; applications: MarketplaceApplication[] } | null;
type ClearChatTarget = { gigId: number; applicationId: number; counterpartName: string } | null;
type GigListViewMode = 'active' | 'history' | 'all';
const DURATION_PRESETS = ['1', '2', '3', '4'];

const extractCityName = (raw: string | null | undefined): string => {
  const value = (raw || '').trim();
  if (!value) return '';
  // Common formats in this app: "Cidade/UF", "Cidade, UF", "Cidade - UF"
  const slash = value.split('/')[0]?.trim() || value;
  const comma = slash.split(',')[0]?.trim() || slash;
  const dash = comma.split(' - ')[0]?.trim() || comma;
  return dash;
};

const normalizeCityKey = (raw: string | null | undefined): string => {
  const value = extractCityName(raw).toLowerCase().trim();
  if (!value) return '';
  // Remove accents
  const noAccents = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return noAccents.replace(/\s+/g, ' ').trim();
};

const GIG_HISTORY_WINDOW_DAYS = 14;
const GIG_HISTORY_WINDOW_MS = GIG_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
const GIG_HISTORY_STATUSES = new Set(['closed', 'cancelled']);

const getGigHistoryAnchorDate = (gig: MarketplaceGig): Date | null => {
  // Para vagas encerradas, priorizamos updated_at (momento de encerramento).
  const updatedAt = new Date(gig.updated_at);
  if (!Number.isNaN(updatedAt.getTime())) return updatedAt;

  if (gig.event_date) {
    const [year, month, day] = gig.event_date.split('T')[0].split('-').map(Number);
    if (year && month && day) {
      const [hours, minutes] = (gig.end_time || '23:59').slice(0, 5).split(':').map(Number);
      const safeHours = Number.isFinite(hours) ? hours : 23;
      const safeMinutes = Number.isFinite(minutes) ? minutes : 59;
      return new Date(year, month - 1, day, safeHours, safeMinutes, 0, 0);
    }
  }

  const createdAt = new Date(gig.created_at);
  if (!Number.isNaN(createdAt.getTime())) return createdAt;

  return null;
};

const isGigInHistoryWindow = (gig: MarketplaceGig, now: Date): boolean => {
  if (!GIG_HISTORY_STATUSES.has(gig.status)) return false;
  const anchorDate = getGigHistoryAnchorDate(gig);
  if (!anchorDate) return false;
  const ageMs = now.getTime() - anchorDate.getTime();
  return ageMs >= 0 && ageMs <= GIG_HISTORY_WINDOW_MS;
};

const Marketplace: React.FC = () => {
  const { user } = useAuth();
  const [gigs, setGigs] = useState<MarketplaceGig[]>([]);
  const [myApplications, setMyApplications] = useState<MarketplaceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [cityFilterTouched, setCityFilterTouched] = useState(false);
  const [mainGigViewMode, setMainGigViewMode] = useState<GigListViewMode>('active');
  const [myGigViewMode, setMyGigViewMode] = useState<GigListViewMode>('active');

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
  const [hireTarget, setHireTarget] = useState<HireTarget>(null);
  const [hireLoading, setHireLoading] = useState(false);
  const [selectedApplicationsByGig, setSelectedApplicationsByGig] = useState<
    Record<number, number[]>
  >({});
  const [closeTarget, setCloseTarget] = useState<CloseTarget>(null);
  const [closeLoading, setCloseLoading] = useState(false);
  const [applicationsByGig, setApplicationsByGig] = useState<
    Record<number, MarketplaceApplication[]>
  >({});
  const [applicationsOpen, setApplicationsOpen] = useState<Record<number, boolean>>({});
  const [applicationsLoading, setApplicationsLoading] = useState<Record<number, boolean>>({});
  const [chatByApp, setChatByApp] = useState<Record<number, MarketplaceGigChatMessage[]>>({});
  const [chatOpen, setChatOpen] = useState<Record<number, boolean>>({});
  const [chatLoading, setChatLoading] = useState<Record<number, boolean>>({});
  const [chatSending, setChatSending] = useState<Record<number, boolean>>({});
  const [chatClearing, setChatClearing] = useState<Record<number, boolean>>({});
  const [chatDraftByApp, setChatDraftByApp] = useState<Record<number, string>>({});
  const [clearChatTarget, setClearChatTarget] = useState<ClearChatTarget>(null);
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

  useEffect(() => {
    if (cityFilterTouched) return;
    const next = user?.city?.trim() || '';
    if (next) {
      setCityFilter(next);
    }
  }, [user?.city, cityFilterTouched]);

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
      setApplicationsByGig(prev => {
        const next = { ...prev };
        gigsData.forEach(gig => {
          if (gig.applications) {
            next[gig.id] = gig.applications;
          }
        });
        return next;
      });
      setSelectedApplicationsByGig(prev => {
        const next: Record<number, number[]> = { ...prev };
        gigsData.forEach(gig => {
          const apps = (gig.applications || []).filter(app => app.status === 'pending');
          const validIds = new Set(apps.map(app => app.id));
          const current = prev[gig.id] || [];
          next[gig.id] = current.filter(id => validIds.has(id));
        });
        return next;
      });
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

  const handleApply = async (gig: MarketplaceGig) => {
    const gigId = gig.id;
    const payload = applyForms[gigId] || { cover_letter: '', expected_fee: '' };
    const normalizedExpectedFee = normalizeCurrency(payload.expected_fee);
    const expectedFeeValue = normalizedExpectedFee ? Number(normalizedExpectedFee) : 0;
    const budgetDefined = gig.budget !== null && gig.budget !== undefined && gig.budget !== '';
    const budgetValue = parseCurrencyValue(gig.budget);

    if (budgetDefined && normalizedExpectedFee && expectedFeeValue > budgetValue) {
      setError('Seu cachê não pode ser maior que o orçamento total da vaga.');
      return;
    }

    try {
      await marketplaceService.applyToGig(gigId, {
        ...payload,
        cover_letter: sanitizeOptionalText(payload.cover_letter, 2000) || '',
        expected_fee: normalizedExpectedFee,
      });
      await loadData();
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    }
  };

  const getOwnerApplications = useCallback(
    (gig: MarketplaceGig): MarketplaceApplication[] => {
      if (applicationsByGig[gig.id]) return applicationsByGig[gig.id];
      return gig.applications || [];
    },
    [applicationsByGig]
  );

  const hasGigSchedule = (gig: MarketplaceGig): boolean =>
    Boolean(gig.event_date && gig.start_time && gig.end_time);

  const toggleApplicationSelection = (gigId: number, applicationId: number) => {
    setSelectedApplicationsByGig(prev => {
      const current = prev[gigId] || [];
      const next = current.includes(applicationId)
        ? current.filter(id => id !== applicationId)
        : [...current, applicationId];
      return { ...prev, [gigId]: next };
    });
  };

  const clearApplicationSelection = (gigId: number) => {
    setSelectedApplicationsByGig(prev => ({ ...prev, [gigId]: [] }));
  };

  const toggleApplications = async (gig: MarketplaceGig) => {
    const shouldOpen = !applicationsOpen[gig.id];
    setApplicationsOpen(prev => ({ ...prev, [gig.id]: shouldOpen }));

    if (!shouldOpen || applicationsByGig[gig.id] || gig.applications) {
      return;
    }

    try {
      setApplicationsLoading(prev => ({ ...prev, [gig.id]: true }));
      const data = await marketplaceService.getGigApplications(gig.id);
      setApplicationsByGig(prev => ({ ...prev, [gig.id]: data }));
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    } finally {
      setApplicationsLoading(prev => ({ ...prev, [gig.id]: false }));
    }
  };

  const toggleAppChat = async (gigId: number, applicationId: number) => {
    const shouldOpen = !chatOpen[applicationId];
    setChatOpen(prev => ({ ...prev, [applicationId]: shouldOpen }));

    if (!shouldOpen) {
      return;
    }

    try {
      setChatLoading(prev => ({ ...prev, [applicationId]: true }));
      const messages = await marketplaceService.getApplicationChat(gigId, applicationId);
      setChatByApp(prev => ({ ...prev, [applicationId]: messages }));
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    } finally {
      setChatLoading(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  const handleChatDraftChange = (applicationId: number, value: string) => {
    setChatDraftByApp(prev => ({ ...prev, [applicationId]: value }));
  };

  const handleSendChatMessage = async (gigId: number, applicationId: number) => {
    const draft = sanitizeOptionalText(chatDraftByApp[applicationId], 600) || '';
    if (!draft) {
      return;
    }

    try {
      setChatSending(prev => ({ ...prev, [applicationId]: true }));
      const message = await marketplaceService.sendApplicationChatMessage(
        gigId,
        applicationId,
        draft
      );
      setChatByApp(prev => ({
        ...prev,
        [applicationId]: [...(prev[applicationId] || []), message],
      }));
      setChatDraftByApp(prev => ({ ...prev, [applicationId]: '' }));
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    } finally {
      setChatSending(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  const clearAppChat = async (gigId: number, applicationId: number) => {
    try {
      setChatClearing(prev => ({ ...prev, [applicationId]: true }));
      await marketplaceService.clearApplicationChat(gigId, applicationId);
      setChatByApp(prev => ({ ...prev, [applicationId]: [] }));
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    } finally {
      setChatClearing(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  const requestClearAppChat = (gigId: number, applicationId: number, counterpartName: string) => {
    setClearChatTarget({ gigId, applicationId, counterpartName });
  };

  const handleConfirmClearAppChat = async () => {
    if (!clearChatTarget) return;
    await clearAppChat(clearChatTarget.gigId, clearChatTarget.applicationId);
    setClearChatTarget(null);
  };

  const handleHire = async () => {
    if (!hireTarget) return;
    try {
      setHireLoading(true);
      const selectedIds = hireTarget.applications.map(app => app.id);
      await marketplaceService.hireApplication(hireTarget.gig.id, selectedIds);
      setHireTarget(null);
      setApplicationsOpen(prev => ({ ...prev, [hireTarget.gig.id]: true }));
      setSelectedApplicationsByGig(prev => ({ ...prev, [hireTarget.gig.id]: [] }));
      await loadData();
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    } finally {
      setHireLoading(false);
    }
  };

  const handleCloseGig = async () => {
    if (!closeTarget) return;
    try {
      setCloseLoading(true);
      await marketplaceService.closeGig(closeTarget.gig.id, closeTarget.status);
      setCloseTarget(null);
      await loadData();
    } catch (err) {
      logError('Marketplace', err);
      setError(getErrorMessage(err));
    } finally {
      setCloseLoading(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'Data a combinar';
    const [year, month, day] = value.split('T')[0].split('-').map(Number);
    if (!year || !month || !day) return 'Data a combinar';
    const localDate = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(localDate);
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'Agora';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Agora';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  const formatCurrency = (value?: string | number | null) => {
    if (!value) return 'A combinar';
    const num = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(num)) return 'A combinar';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseCurrencyValue = (value?: string | number | null): number => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(parsed) ? parsed : 0;
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

  const renderMyGigListButton = (gig: MarketplaceGig) => (
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
  );

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

  const now = new Date();
  const cityFilterKey = normalizeCityKey(cityFilter);
  const gigsByCity = gigs.filter(gig => {
    if (!cityFilterKey) return true;
    const gigKey = normalizeCityKey(gig.city);
    return gigKey.startsWith(cityFilterKey);
  });
  const activeVisibleGigs = gigsByCity.filter(gig => !GIG_HISTORY_STATUSES.has(gig.status));
  const historicalVisibleGigs = gigsByCity.filter(gig => isGigInHistoryWindow(gig, now));
  const visibleGigs =
    mainGigViewMode === 'active'
      ? activeVisibleGigs
      : mainGigViewMode === 'history'
        ? historicalVisibleGigs
        : [...activeVisibleGigs, ...historicalVisibleGigs];
  const historicalVisibleGigIds = new Set(historicalVisibleGigs.map(gig => gig.id));

  const myGigs = gigs.filter(gig => gig.created_by === user?.user.id);
  const myActiveGigs = myGigs.filter(gig => !GIG_HISTORY_STATUSES.has(gig.status));
  const myHistoricalGigs = myGigs.filter(gig => isGigInHistoryWindow(gig, now));
  const myVisibleGigs =
    myGigViewMode === 'active'
      ? myActiveGigs
      : myGigViewMode === 'history'
        ? myHistoricalGigs
        : [...myActiveGigs, ...myHistoricalGigs];

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
                <div className="card-contrast border-primary-200/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Filtrar por cidade
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={cityFilter}
                        onChange={e => {
                          setCityFilterTouched(true);
                          setCityFilter(e.target.value);
                        }}
                        placeholder={user?.city ? `Ex: ${user.city}` : 'Ex: São Paulo'}
                      />
                      <p className="mt-2 text-xs text-gray-600">
                        {cityFilter?.trim()
                          ? `Mostrando: ${cityFilter.trim()}`
                          : 'Mostrando: todas as cidades'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {user?.city ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCityFilterTouched(true);
                            setCityFilter(user.city || '');
                          }}
                          className="btn-secondary"
                        >
                          Minha cidade
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setCityFilterTouched(true);
                          setCityFilter('');
                        }}
                        className="btn-secondary"
                      >
                        Todas
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card-contrast border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Exibição das vagas</h3>
                    <span className="text-xs text-gray-600">
                      {visibleGigs.length} resultado{visibleGigs.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMainGigViewMode('active')}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mainGigViewMode === 'active'
                          ? 'border-primary-300 bg-primary-100 text-primary-800'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Abertas ({activeVisibleGigs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainGigViewMode('history')}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mainGigViewMode === 'history'
                          ? 'border-slate-300 bg-slate-100 text-slate-800'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Histórico ({historicalVisibleGigs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainGigViewMode('all')}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mainGigViewMode === 'all'
                          ? 'border-gray-300 bg-gray-100 text-gray-800'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Todas
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    {mainGigViewMode === 'active'
                      ? 'Foco nas vagas abertas, em avaliação e contratadas.'
                      : mainGigViewMode === 'history'
                        ? `Mostrando somente vagas encerradas dos últimos ${GIG_HISTORY_WINDOW_DAYS} dias.`
                        : 'Mostrando vagas ativas e histórico recente na mesma lista.'}
                  </p>
                </div>

                {gigs.length === 0 ? (
                  <div className="card-contrast">
                    <p className="text-gray-700">
                      Não há oportunidades ativas. Publique a primeira.
                    </p>
                  </div>
                ) : visibleGigs.length === 0 ? (
                  <div className="card-contrast">
                    <p className="text-gray-700">
                      {cityFilterKey
                        ? 'Nenhuma vaga encontrada para o filtro atual.'
                        : mainGigViewMode === 'active'
                          ? 'Não há vagas ativas para exibir.'
                          : mainGigViewMode === 'history'
                            ? `Não há vagas encerradas nos últimos ${GIG_HISTORY_WINDOW_DAYS} dias.`
                            : 'Não há vagas ativas nem histórico recente para exibir.'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCityFilterTouched(true);
                          setCityFilter('');
                        }}
                        className="btn-primary"
                      >
                        Ver todas as cidades
                      </button>
                      {user?.city ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCityFilterTouched(true);
                            setCityFilter(user.city || '');
                          }}
                          className="btn-secondary"
                        >
                          Voltar para minha cidade
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  visibleGigs.map((gig, index) => {
                    const isHistoricalGig = historicalVisibleGigIds.has(gig.id);
                    const previousGig = index > 0 ? visibleGigs[index - 1] : null;
                    const showHistoryHeader =
                      mainGigViewMode === 'all' &&
                      isHistoricalGig &&
                      (!previousGig || !historicalVisibleGigIds.has(previousGig.id));
                    const applyForm = applyForms[gig.id] || { cover_letter: '', expected_fee: '' };
                    const normalizedApplyFee = normalizeCurrency(applyForm.expected_fee || '');
                    const applyFeeValue = normalizedApplyFee ? Number(normalizedApplyFee) : 0;
                    const canApply = gig.status === 'open' || gig.status === 'in_review';
                    const isOwner = gig.created_by ? gig.created_by === user?.user.id : false;
                    const ownerApplications = getOwnerApplications(gig);
                    const applicationsVisible = !!applicationsOpen[gig.id];
                    const ownerPendingApplications = ownerApplications.filter(
                      app => app.status === 'pending'
                    );
                    const canCloseGig = !['closed', 'cancelled'].includes(gig.status);
                    const canHire = ['open', 'in_review'].includes(gig.status);
                    const canHireWithSchedule = canHire && hasGigSchedule(gig);
                    const selectedIds = selectedApplicationsByGig[gig.id] || [];
                    const selectedPendingApplications = ownerPendingApplications.filter(app =>
                      selectedIds.includes(app.id)
                    );
                    const gigBudgetDefined =
                      gig.budget !== null && gig.budget !== undefined && gig.budget !== '';
                    const gigBudgetValue = parseCurrencyValue(gig.budget);
                    const selectedBudgetTotal = selectedPendingApplications.reduce(
                      (acc, app) => acc + parseCurrencyValue(app.expected_fee),
                      0
                    );
                    const selectedHasMissingFee = selectedPendingApplications.some(
                      app =>
                        app.expected_fee === undefined ||
                        app.expected_fee === null ||
                        app.expected_fee === ''
                    );
                    const isSelectedOverBudget =
                      gigBudgetDefined && selectedBudgetTotal > gigBudgetValue;
                    const canHireSelected =
                      selectedPendingApplications.length > 0 &&
                      !selectedHasMissingFee &&
                      !isSelectedOverBudget;
                    const isApplyOverBudget =
                      gigBudgetDefined && normalizedApplyFee && applyFeeValue > gigBudgetValue;
                    const canChat = !['closed', 'cancelled'].includes(gig.status);

                    return (
                      <React.Fragment key={gig.id}>
                        {showHistoryHeader ? (
                          <div className="card-contrast border-slate-200/80 bg-slate-50/60">
                            <h3 className="text-base font-semibold text-gray-900">
                              Histórico de vagas (últimos {GIG_HISTORY_WINDOW_DAYS} dias)
                            </h3>
                            <p className="mt-1 text-xs text-gray-600">
                              Vagas encerradas ficam disponíveis aqui por {GIG_HISTORY_WINDOW_DAYS}{' '}
                              dias.
                            </p>
                          </div>
                        ) : null}
                        <div
                          id={`gig-${gig.id}`}
                          className={`card-contrast hover:shadow-2xl transition-all ${
                            isHistoricalGig ? 'border-slate-200/80 bg-slate-50/60' : ''
                          }`}
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
                              <h3 className="text-lg font-semibold text-gray-900 mt-1">
                                {gig.title}
                              </h3>
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
                                    onClick={() => toggleApplications(gig)}
                                    className="inline-flex items-center gap-1 rounded-full border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700 hover:border-primary-300 hover:text-primary-800 transition-colors"
                                  >
                                    <Users className="h-3.5 w-3.5" />
                                    {applicationsVisible ? 'Ocultar' : 'Candidaturas'}
                                  </button>
                                  {canCloseGig ? (
                                    <button
                                      type="button"
                                      onClick={() => setCloseTarget({ gig, status: 'closed' })}
                                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:border-amber-300 hover:text-amber-800 transition-colors"
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                      Encerrar
                                    </button>
                                  ) : null}
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
                              <div className="space-y-3">
                                <div className="rounded-lg border border-primary-200 bg-gradient-to-r from-primary-100 via-white to-primary-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 px-3 py-2 text-sm text-primary-900 shadow-sm">
                                  <p className="font-semibold tracking-wide">
                                    Você publicou esta vaga.
                                  </p>
                                  <p className="text-xs text-primary-800 mt-1">
                                    Pendentes: {ownerPendingApplications.length} de{' '}
                                    {ownerApplications.length} candidatura(s)
                                  </p>
                                  {gigBudgetDefined ? (
                                    <p className="text-xs text-primary-800 mt-1">
                                      Orçamento total: {formatCurrency(gig.budget)}
                                    </p>
                                  ) : null}
                                  {!canHireWithSchedule && canHire ? (
                                    <p className="text-xs text-amber-700 mt-2">
                                      Defina data e horário da vaga para contratar e bloquear a
                                      agenda da banda automaticamente.
                                    </p>
                                  ) : null}
                                </div>

                                {ownerPendingApplications.length > 1 && canHireWithSchedule ? (
                                  <div className="rounded-lg border border-purple-200 bg-purple-50/50 px-3 py-2">
                                    <p className="text-xs font-semibold text-purple-900">
                                      Formar banda nesta vaga
                                    </p>
                                    <p className="text-xs text-purple-800 mt-0.5">
                                      Selecione 2 ou mais candidaturas pendentes e contrate em lote.
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={!canHireSelected}
                                        onClick={() =>
                                          setHireTarget({
                                            gig,
                                            applications: selectedPendingApplications,
                                          })
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Contratar selecionados ({selectedPendingApplications.length}
                                        )
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => clearApplicationSelection(gig.id)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 transition-colors"
                                      >
                                        Limpar seleção
                                      </button>
                                    </div>
                                    {selectedPendingApplications.length > 0 ? (
                                      <div className="mt-2 text-xs">
                                        <p className="text-purple-800">
                                          Total selecionado: {formatCurrency(selectedBudgetTotal)}
                                          {gigBudgetDefined
                                            ? ` / Orçamento: ${formatCurrency(gig.budget)}`
                                            : ''}
                                        </p>
                                        {selectedHasMissingFee ? (
                                          <p className="text-amber-700 mt-1">
                                            Há músico selecionado sem cachê informado.
                                          </p>
                                        ) : null}
                                        {isSelectedOverBudget ? (
                                          <p className="text-rose-700 mt-1">
                                            A soma dos cachês selecionados ultrapassa o orçamento da
                                            vaga.
                                          </p>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}

                                {applicationsVisible ? (
                                  <div className="rounded-lg border border-gray-100 p-3">
                                    {applicationsLoading[gig.id] ? (
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Carregando candidaturas...
                                      </div>
                                    ) : ownerApplications.length === 0 ? (
                                      <p className="text-sm text-gray-600">
                                        Ainda não há candidaturas para esta vaga.
                                      </p>
                                    ) : (
                                      <div className="space-y-3">
                                        {ownerApplications.map(application => {
                                          const appChatVisible = !!chatOpen[application.id];
                                          const appChatMessages = chatByApp[application.id] || [];
                                          const appChatDraft = chatDraftByApp[application.id] || '';
                                          const msgCount = application.chat_message_count || 0;

                                          return (
                                            <div
                                              key={application.id}
                                              className="rounded-lg border border-gray-100 p-3"
                                            >
                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                  {application.status === 'pending' &&
                                                  canHireWithSchedule ? (
                                                    <input
                                                      type="checkbox"
                                                      checked={selectedIds.includes(application.id)}
                                                      onChange={() =>
                                                        toggleApplicationSelection(
                                                          gig.id,
                                                          application.id
                                                        )
                                                      }
                                                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                  ) : null}
                                                  <p className="font-semibold text-gray-900">
                                                    {application.musician_name}
                                                  </p>
                                                </div>
                                                <span
                                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[application.status] || 'bg-gray-100 text-gray-700'}`}
                                                >
                                                  {statusLabel[application.status] ||
                                                    application.status}
                                                </span>
                                              </div>
                                              <p className="text-xs text-gray-500 mt-1">
                                                Enviado em {formatDateTime(application.created_at)}
                                              </p>
                                              <p className="text-sm text-gray-700 mt-2">
                                                Cache: {formatCurrency(application.expected_fee)}
                                              </p>
                                              {gigBudgetDefined &&
                                              parseCurrencyValue(application.expected_fee) >
                                                gigBudgetValue ? (
                                                <p className="text-xs text-rose-700 mt-1">
                                                  Cachê acima do orçamento total da vaga (
                                                  {formatCurrency(gig.budget)}).
                                                </p>
                                              ) : null}
                                              {gigBudgetDefined &&
                                              (application.expected_fee === null ||
                                                application.expected_fee === undefined ||
                                                application.expected_fee === '') ? (
                                                <p className="text-xs text-amber-700 mt-1">
                                                  Informe o cachê deste candidato para contratar com
                                                  orçamento definido.
                                                </p>
                                              ) : null}
                                              {application.cover_letter ? (
                                                <p className="text-xs text-gray-600 mt-1">
                                                  {application.cover_letter}
                                                </p>
                                              ) : null}
                                              <div className="flex flex-wrap items-center gap-2 mt-3">
                                                {application.status === 'pending' &&
                                                canHireWithSchedule ? (
                                                  <button
                                                    type="button"
                                                    disabled={
                                                      gigBudgetDefined &&
                                                      (parseCurrencyValue(
                                                        application.expected_fee
                                                      ) > gigBudgetValue ||
                                                        !application.expected_fee)
                                                    }
                                                    onClick={() =>
                                                      setHireTarget({
                                                        gig,
                                                        applications: [application],
                                                      })
                                                    }
                                                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                                  >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Contratar este músico
                                                  </button>
                                                ) : null}
                                                {canChat ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      toggleAppChat(gig.id, application.id)
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:border-blue-300 hover:text-blue-800 transition-colors"
                                                  >
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                    {appChatVisible ? 'Fechar chat' : 'Chat'}
                                                    {msgCount > 0 && !appChatVisible ? (
                                                      <span className="ml-1 rounded-full bg-blue-600 px-1.5 text-[10px] text-white">
                                                        {msgCount}
                                                      </span>
                                                    ) : null}
                                                  </button>
                                                ) : null}
                                              </div>

                                              {appChatVisible && canChat ? (
                                                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/30 p-3 space-y-3 dark:bg-blue-950/20 dark:border-blue-900">
                                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                                                      Chat com {application.musician_name}
                                                    </p>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        requestClearAppChat(
                                                          gig.id,
                                                          application.id,
                                                          application.musician_name
                                                        )
                                                      }
                                                      disabled={chatClearing[application.id]}
                                                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:border-rose-300 disabled:opacity-60 transition-colors"
                                                    >
                                                      {chatClearing[application.id] ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : (
                                                        <Eraser className="h-3 w-3" />
                                                      )}
                                                      Apagar
                                                    </button>
                                                  </div>
                                                  <div className="max-h-56 overflow-y-auto rounded-lg border border-blue-100 bg-white dark:bg-gray-900 dark:border-blue-900 p-2 space-y-2">
                                                    {chatLoading[application.id] ? (
                                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        Carregando...
                                                      </div>
                                                    ) : appChatMessages.length === 0 ? (
                                                      <p className="text-xs text-gray-500 px-1 py-2">
                                                        Nenhuma mensagem ainda.
                                                      </p>
                                                    ) : (
                                                      appChatMessages.map(
                                                        (msg: MarketplaceGigChatMessage) => {
                                                          const isMine =
                                                            msg.sender === user?.user.id;
                                                          return (
                                                            <div
                                                              key={msg.id}
                                                              className={`rounded-lg px-3 py-2 text-xs ${isMine ? 'bg-blue-600 text-white ml-8' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-8'}`}
                                                            >
                                                              <p className="font-semibold">
                                                                {msg.sender_name}
                                                              </p>
                                                              <p className="mt-1 whitespace-pre-wrap break-words">
                                                                {msg.message}
                                                              </p>
                                                              <p
                                                                className={`mt-1 ${isMine ? 'text-blue-100' : 'text-slate-500'}`}
                                                              >
                                                                {formatDateTime(msg.created_at)}
                                                              </p>
                                                            </div>
                                                          );
                                                        }
                                                      )
                                                    )}
                                                  </div>
                                                  <div className="flex flex-col sm:flex-row gap-2">
                                                    <input
                                                      type="text"
                                                      className="input-field w-full sm:flex-1"
                                                      placeholder="Escreva uma mensagem..."
                                                      value={appChatDraft}
                                                      onChange={e =>
                                                        handleChatDraftChange(
                                                          application.id,
                                                          e.target.value
                                                        )
                                                      }
                                                      maxLength={600}
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        handleSendChatMessage(
                                                          gig.id,
                                                          application.id
                                                        )
                                                      }
                                                      disabled={
                                                        chatSending[application.id] ||
                                                        !appChatDraft.trim()
                                                      }
                                                      className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                      {chatSending[application.id] ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                      ) : (
                                                        <Send className="h-4 w-4" />
                                                      )}
                                                      Enviar
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : null}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            ) : gig.my_application ? (
                              (() => {
                                const myAppId = gig.my_application!.id;
                                const myAppChatOpen = !!chatOpen[myAppId];
                                const myAppChatMessages = chatByApp[myAppId] || [];
                                const myAppChatDraft = chatDraftByApp[myAppId] || '';
                                const myAppMsgCount = gig.my_application!.chat_message_count || 0;

                                return (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-primary-50 border border-primary-100 rounded-lg p-3 text-sm">
                                      <div>
                                        <p className="text-primary-800 font-semibold">
                                          Você já se candidatou
                                        </p>
                                        <p className="text-primary-700">
                                          Status:{' '}
                                          {statusLabel[gig.my_application!.status] ||
                                            gig.my_application!.status}
                                        </p>
                                        {gig.my_application!.status === 'hired' ? (
                                          <p className="text-xs text-primary-700 mt-1">
                                            Você foi contratado. Combine os detalhes com o
                                            contratante.
                                          </p>
                                        ) : null}
                                      </div>
                                      <div className="text-right text-xs text-gray-600 space-y-2">
                                        {gig.my_application!.expected_fee && (
                                          <p>
                                            Cache:{' '}
                                            {formatCurrency(gig.my_application!.expected_fee)}
                                          </p>
                                        )}
                                        {canChat ? (
                                          <button
                                            type="button"
                                            onClick={() => toggleAppChat(gig.id, myAppId)}
                                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:border-blue-300 hover:text-blue-800 transition-colors"
                                          >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            {myAppChatOpen ? 'Fechar chat' : 'Chat'}
                                            {myAppMsgCount > 0 && !myAppChatOpen ? (
                                              <span className="ml-1 rounded-full bg-blue-600 px-1.5 text-[10px] text-white">
                                                {myAppMsgCount}
                                              </span>
                                            ) : null}
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>

                                    {myAppChatOpen && canChat ? (
                                      <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-3 space-y-3 dark:bg-blue-950/20 dark:border-blue-900">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                                            Chat com {gig.created_by_name || 'Contratante'}
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              requestClearAppChat(
                                                gig.id,
                                                myAppId,
                                                gig.created_by_name || 'contratante'
                                              )
                                            }
                                            disabled={chatClearing[myAppId]}
                                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:border-rose-300 disabled:opacity-60 transition-colors"
                                          >
                                            {chatClearing[myAppId] ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <Eraser className="h-3 w-3" />
                                            )}
                                            Apagar
                                          </button>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto rounded-lg border border-blue-100 bg-white dark:bg-gray-900 dark:border-blue-900 p-2 space-y-2">
                                          {chatLoading[myAppId] ? (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              Carregando...
                                            </div>
                                          ) : myAppChatMessages.length === 0 ? (
                                            <p className="text-xs text-gray-500 px-1 py-2">
                                              Nenhuma mensagem ainda.
                                            </p>
                                          ) : (
                                            myAppChatMessages.map(
                                              (msg: MarketplaceGigChatMessage) => {
                                                const isMine = msg.sender === user?.user.id;
                                                return (
                                                  <div
                                                    key={msg.id}
                                                    className={`rounded-lg px-3 py-2 text-xs ${isMine ? 'bg-blue-600 text-white ml-8' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-8'}`}
                                                  >
                                                    <p className="font-semibold">
                                                      {msg.sender_name}
                                                    </p>
                                                    <p className="mt-1 whitespace-pre-wrap break-words">
                                                      {msg.message}
                                                    </p>
                                                    <p
                                                      className={`mt-1 ${isMine ? 'text-blue-100' : 'text-slate-500'}`}
                                                    >
                                                      {formatDateTime(msg.created_at)}
                                                    </p>
                                                  </div>
                                                );
                                              }
                                            )
                                          )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                          <input
                                            type="text"
                                            className="input-field w-full sm:flex-1"
                                            placeholder="Escreva uma mensagem..."
                                            value={myAppChatDraft}
                                            onChange={e =>
                                              handleChatDraftChange(myAppId, e.target.value)
                                            }
                                            maxLength={600}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleSendChatMessage(gig.id, myAppId)}
                                            disabled={
                                              chatSending[myAppId] || !myAppChatDraft.trim()
                                            }
                                            className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                          >
                                            {chatSending[myAppId] ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Send className="h-4 w-4" />
                                            )}
                                            Enviar
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })()
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
                                    onClick={() => handleApply(gig)}
                                    disabled={!canApply || Boolean(isApplyOverBudget)}
                                  >
                                    <Send className="h-4 w-4" />
                                    Candidatar
                                  </button>
                                </div>
                                {isApplyOverBudget ? (
                                  <p className="text-xs text-rose-700">
                                    O cachê informado ultrapassa o orçamento da vaga (
                                    {formatCurrency(gig.budget)}).
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              <div className="space-y-4">
                <div className="card-contrast border-primary-200/70">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Cadastrar oportunidade
                  </h3>
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
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMyGigViewMode('active')}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        myGigViewMode === 'active'
                          ? 'border-primary-300 bg-primary-100 text-primary-800'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Abertas ({myActiveGigs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyGigViewMode('history')}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        myGigViewMode === 'history'
                          ? 'border-slate-300 bg-slate-100 text-slate-800'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Histórico ({myHistoricalGigs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyGigViewMode('all')}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        myGigViewMode === 'all'
                          ? 'border-gray-300 bg-gray-100 text-gray-800'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Todas
                    </button>
                  </div>
                  {myActiveGigs.length === 0 && myHistoricalGigs.length === 0 ? (
                    <p className="text-sm text-gray-600">Você ainda não publicou nenhuma vaga.</p>
                  ) : myVisibleGigs.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      {myGigViewMode === 'active'
                        ? 'Você não possui vagas abertas no momento.'
                        : myGigViewMode === 'history'
                          ? `Você não possui vagas no histórico dos últimos ${GIG_HISTORY_WINDOW_DAYS} dias.`
                          : 'Não há vagas para exibir.'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {myGigViewMode === 'all' ? (
                        <>
                          {myActiveGigs.map(renderMyGigListButton)}
                          {myHistoricalGigs.length > 0 ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                              <p className="text-xs font-semibold text-slate-700">
                                Histórico ({GIG_HISTORY_WINDOW_DAYS} dias)
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                Vagas encerradas recentes ficam aqui temporariamente.
                              </p>
                            </div>
                          ) : null}
                          {myHistoricalGigs.map(renderMyGigListButton)}
                        </>
                      ) : (
                        myVisibleGigs.map(renderMyGigListButton)
                      )}
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
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Início
                      </label>
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

        <ConfirmModal
          isOpen={!!hireTarget}
          onClose={() => setHireTarget(null)}
          onConfirm={handleHire}
          title="Confirmar contratação"
          message={
            hireTarget ? (
              <div className="space-y-2">
                <p>
                  Deseja contratar {hireTarget.applications.length} músico
                  {hireTarget.applications.length > 1 ? 's' : ''} para a vaga "
                  {hireTarget.gig.title}"?
                </p>
                <ul className="list-disc pl-5">
                  {hireTarget.applications.map(app => (
                    <li key={app.id}>{app.musician_name}</li>
                  ))}
                </ul>
                <p>
                  As demais candidaturas pendentes serão recusadas e data/horário da vaga serão
                  adicionados automaticamente na agenda dos envolvidos.
                </p>
              </div>
            ) : (
              ''
            )
          }
          confirmText="Contratar"
          cancelText="Cancelar"
          confirmVariant="primary"
          loading={hireLoading}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <ConfirmModal
          isOpen={!!closeTarget}
          onClose={() => setCloseTarget(null)}
          onConfirm={handleCloseGig}
          title="Encerrar vaga"
          message={
            closeTarget
              ? `Deseja encerrar a vaga "${closeTarget.gig.title}"? Candidaturas pendentes serão marcadas como recusadas e os músicos afetados serão notificados.`
              : ''
          }
          confirmText="Encerrar vaga"
          cancelText="Cancelar"
          confirmVariant="warning"
          loading={closeLoading}
          icon={<Ban className="h-5 w-5" />}
        />

        <ConfirmModal
          isOpen={!!clearChatTarget}
          onClose={() => setClearChatTarget(null)}
          onConfirm={handleConfirmClearAppChat}
          title="Apagar histórico do chat"
          message={
            clearChatTarget
              ? `Deseja apagar todo o histórico do chat com ${clearChatTarget.counterpartName}? Esta ação não pode ser desfeita.`
              : ''
          }
          confirmText="Apagar"
          cancelText="Cancelar"
          confirmVariant="danger"
          loading={clearChatTarget ? Boolean(chatClearing[clearChatTarget.applicationId]) : false}
          icon={<Eraser className="h-5 w-5" />}
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
