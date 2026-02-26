import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { marketplaceService } from '../../services/api';
import type {
  MarketplaceApplication,
  MarketplaceGig,
  MarketplaceGigChatMessage,
} from '../../types';
import { logError } from '../../utils/logger';
import { sanitizeOptionalText, sanitizeText } from '../../utils/sanitize';
import { getErrorMessage } from '../../utils/toast';
import {
  DURATION_PRESETS,
  type ClearChatTarget,
  type CloseTarget,
  type GigListViewMode,
  type HireTarget,
} from './types';
import { formatCurrencyInput, formatPhone, normalizeCurrency } from './utils';

export type GigForm = {
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

type ApplyForm = { cover_letter: string; expected_fee: string };
type CityOption = { id: number; name: string; state: string };

const EMPTY_FORM: GigForm = {
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
};

export function useMarketplace() {
  const { user } = useAuth();

  // Data
  const [gigs, setGigs] = useState<MarketplaceGig[]>([]);
  const [myApplications, setMyApplications] = useState<MarketplaceApplication[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Filters
  const [cityFilter, setCityFilter] = useState('');
  const [cityFilterTouched, setCityFilterTouched] = useState(false);
  const [mainGigViewMode, setMainGigViewMode] = useState<GigListViewMode>('active');
  const [myGigViewMode, setMyGigViewMode] = useState<GigListViewMode>('active');

  // Form
  const [form, setForm] = useState<GigForm>(EMPTY_FORM);
  const [editingGig, setEditingGig] = useState<MarketplaceGig | null>(null);

  // City search (in modal)
  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityFeedback, setCityFeedback] = useState('');

  // Duration
  const [duration, setDuration] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [customDurationActive, setCustomDurationActive] = useState(false);

  // Applications
  const [applyForms, setApplyForms] = useState<Record<number, ApplyForm>>({});
  const [applicationsByGig, setApplicationsByGig] = useState<
    Record<number, MarketplaceApplication[]>
  >({});
  const [applicationsOpen, setApplicationsOpen] = useState<Record<number, boolean>>({});
  const [applicationsLoading, setApplicationsLoading] = useState<Record<number, boolean>>({});
  const [selectedApplicationsByGig, setSelectedApplicationsByGig] = useState<
    Record<number, number[]>
  >({});

  // Chat
  const [chatByApp, setChatByApp] = useState<Record<number, MarketplaceGigChatMessage[]>>({});
  const [chatOpen, setChatOpen] = useState<Record<number, boolean>>({});
  const [chatLoading, setChatLoading] = useState<Record<number, boolean>>({});
  const [chatSending, setChatSending] = useState<Record<number, boolean>>({});
  const [chatClearing, setChatClearing] = useState<Record<number, boolean>>({});
  const [chatDraftByApp, setChatDraftByApp] = useState<Record<number, string>>({});
  const [clearChatTarget, setClearChatTarget] = useState<ClearChatTarget>(null);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<MarketplaceGig | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hireTarget, setHireTarget] = useState<HireTarget>(null);
  const [hireLoading, setHireLoading] = useState(false);
  const [closeTarget, setCloseTarget] = useState<CloseTarget>(null);
  const [closeLoading, setCloseLoading] = useState(false);

  useBodyScrollLock(showCreateModal);

  const isCustomDuration =
    customDurationActive || (duration !== '' && !DURATION_PRESETS.includes(duration));

  // ─── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
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
  }, []);

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (cityFilterTouched) return;
    const next = user?.city?.trim() || '';
    if (next) setCityFilter(next);
  }, [user?.city, cityFilterTouched]);

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
        if (!response.ok) throw new Error('Falha ao buscar cidades');
        const data = await response.json();
        const options = Array.isArray(data)
          ? data.map((item: { id: number; nome: string; estado: string }) => ({
              id: item.id,
              name: item.nome,
              state: item.estado,
            }))
          : [];
        setCityOptions(options.slice(0, 8));
        if (options.length === 0) setCityFeedback('Nenhuma cidade encontrada');
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
      if (event.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 320);
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
    setForm(prev => ({
      ...prev,
      end_time: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    }));
  }, [duration, form.start_time]);

  useEffect(() => {
    if (!duration || DURATION_PRESETS.includes(duration)) return;
    if (!customDurationActive) setCustomDurationActive(true);
    if (customDuration !== duration) setCustomDuration(duration);
  }, [duration, customDuration, customDurationActive]);

  // ─── Form handlers ─────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setCityQuery('');
    setCityOptions([]);
    setCityFeedback('');
    setCityOpen(false);
    setDuration('');
    setCustomDuration('');
    setCustomDurationActive(false);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingGig(null);
    resetForm();
    setShowCreateModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((gig: MarketplaceGig) => {
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
      contact_phone: gig.contact_phone ? formatPhone(gig.contact_phone) : '',
    });
    setCityQuery(gig.city || '');
    setCityOptions([]);
    setCityFeedback('');
    setCityOpen(false);
    setDuration('');
    setCustomDuration('');
    setCustomDurationActive(false);
    setShowCreateModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowCreateModal(false);
    setEditingGig(null);
    resetForm();
  }, [resetForm]);

  const handleSubmitGig = useCallback(
    async (event: React.FormEvent) => {
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
    },
    [form, editingGig, resetForm, loadData]
  );

  // ─── Application handlers ──────────────────────────────────────────────────

  const handleApplyChange = useCallback((gigId: number, field: keyof ApplyForm, value: string) => {
    const nextValue = field === 'expected_fee' ? formatCurrencyInput(value) : value;
    setApplyForms(prev => ({
      ...prev,
      [gigId]: {
        cover_letter: prev[gigId]?.cover_letter || '',
        expected_fee: prev[gigId]?.expected_fee || '',
        [field]: nextValue,
      },
    }));
  }, []);

  const handleApply = useCallback(
    async (gig: MarketplaceGig) => {
      const gigId = gig.id;
      const payload = applyForms[gigId] || { cover_letter: '', expected_fee: '' };
      const normalizedExpectedFee = normalizeCurrency(payload.expected_fee);
      const expectedFeeValue = normalizedExpectedFee ? Number(normalizedExpectedFee) : 0;
      const budgetDefined = gig.budget !== null && gig.budget !== undefined && gig.budget !== '';
      const budgetValue = Number(gig.budget) || 0;

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
    },
    [applyForms, loadData]
  );

  const getOwnerApplications = useCallback(
    (gig: MarketplaceGig): MarketplaceApplication[] => {
      if (applicationsByGig[gig.id]) return applicationsByGig[gig.id];
      return gig.applications || [];
    },
    [applicationsByGig]
  );

  const toggleApplicationSelection = useCallback((gigId: number, applicationId: number) => {
    setSelectedApplicationsByGig(prev => {
      const current = prev[gigId] || [];
      const next = current.includes(applicationId)
        ? current.filter(id => id !== applicationId)
        : [...current, applicationId];
      return { ...prev, [gigId]: next };
    });
  }, []);

  const clearApplicationSelection = useCallback((gigId: number) => {
    setSelectedApplicationsByGig(prev => ({ ...prev, [gigId]: [] }));
  }, []);

  const toggleApplications = useCallback(
    async (gig: MarketplaceGig) => {
      const shouldOpen = !applicationsOpen[gig.id];
      setApplicationsOpen(prev => ({ ...prev, [gig.id]: shouldOpen }));

      if (!shouldOpen || applicationsByGig[gig.id] || gig.applications) return;

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
    },
    [applicationsOpen, applicationsByGig]
  );

  // ─── Chat handlers ─────────────────────────────────────────────────────────

  const toggleAppChat = useCallback(
    async (gigId: number, applicationId: number) => {
      const shouldOpen = !chatOpen[applicationId];
      setChatOpen(prev => ({ ...prev, [applicationId]: shouldOpen }));
      if (!shouldOpen) return;

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
    },
    [chatOpen]
  );

  const handleChatDraftChange = useCallback((applicationId: number, value: string) => {
    setChatDraftByApp(prev => ({ ...prev, [applicationId]: value }));
  }, []);

  const handleSendChatMessage = useCallback(
    async (gigId: number, applicationId: number) => {
      const draft = sanitizeOptionalText(chatDraftByApp[applicationId], 600) || '';
      if (!draft) return;

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
    },
    [chatDraftByApp]
  );

  const clearAppChat = useCallback(async (gigId: number, applicationId: number) => {
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
  }, []);

  const requestClearAppChat = useCallback(
    (gigId: number, applicationId: number, counterpartName: string) => {
      setClearChatTarget({ gigId, applicationId, counterpartName });
    },
    []
  );

  const handleConfirmClearAppChat = useCallback(async () => {
    if (!clearChatTarget) return;
    await clearAppChat(clearChatTarget.gigId, clearChatTarget.applicationId);
    setClearChatTarget(null);
  }, [clearChatTarget, clearAppChat]);

  // ─── Gig action handlers ───────────────────────────────────────────────────

  const handleDeleteGig = useCallback(async () => {
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
  }, [deleteTarget, loadData]);

  const handleHire = useCallback(async () => {
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
  }, [hireTarget, loadData]);

  const handleCloseGig = useCallback(async () => {
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
  }, [closeTarget, loadData]);

  return {
    // Data
    user,
    gigs,
    myApplications,

    // UI state
    loading,
    error,
    creating,
    showCreateModal,
    showBackToTop,

    // Filters
    cityFilter,
    setCityFilter,
    cityFilterTouched,
    setCityFilterTouched,
    mainGigViewMode,
    setMainGigViewMode,
    myGigViewMode,
    setMyGigViewMode,

    // Form
    form,
    setForm,
    editingGig,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmitGig,

    // City search
    cityQuery,
    setCityQuery,
    cityOptions,
    cityOpen,
    setCityOpen,
    cityLoading,
    cityFeedback,

    // Duration
    duration,
    setDuration,
    customDuration,
    setCustomDuration,
    customDurationActive,
    setCustomDurationActive,
    isCustomDuration,

    // Applications
    applyForms,
    handleApplyChange,
    handleApply,
    getOwnerApplications,
    applicationsByGig,
    applicationsOpen,
    applicationsLoading,
    selectedApplicationsByGig,
    toggleApplicationSelection,
    clearApplicationSelection,
    toggleApplications,

    // Chat
    chatByApp,
    chatOpen,
    chatLoading,
    chatSending,
    chatClearing,
    chatDraftByApp,
    clearChatTarget,
    setClearChatTarget,
    toggleAppChat,
    handleChatDraftChange,
    handleSendChatMessage,
    requestClearAppChat,
    handleConfirmClearAppChat,

    // Modals
    deleteTarget,
    setDeleteTarget,
    deleteLoading,
    handleDeleteGig,
    hireTarget,
    setHireTarget,
    hireLoading,
    handleHire,
    closeTarget,
    setCloseTarget,
    closeLoading,
    handleCloseGig,

    // Data refresh
    loadData,
  };
}
