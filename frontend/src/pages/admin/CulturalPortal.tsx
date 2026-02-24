import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ExternalLink,
  Globe2,
  MapPin,
  Newspaper,
  Plus,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import {
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminHero,
  AdminLoading,
  AdminModal,
  AdminSearchBar,
} from '../../components/admin';
import {
  adminService,
  type CulturalNoticeAdmin,
  type CulturalNoticeSuggestion,
} from '../../services/adminService';
import type { PortalItem } from '../../types';
import { showToast } from '../../utils/toast';

const FORM_CATEGORY_OPTIONS: Array<{ value: PortalItem['category']; label: string }> = [
  { value: 'noticia', label: 'Notícia' },
  { value: 'edital', label: 'Edital' },
  { value: 'festival', label: 'Festival' },
  { value: 'aldir_blanc', label: 'Aldir Blanc' },
  { value: 'rouanet', label: 'Lei Rouanet' },
  { value: 'premio', label: 'Prêmio' },
  { value: 'other', label: 'Outro' },
];

const CATEGORY_OPTIONS: Array<{ value: 'all' | PortalItem['category']; label: string }> = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'edital', label: 'Editais' },
  { value: 'festival', label: 'Festivais' },
  { value: 'noticia', label: 'Notícias' },
  { value: 'aldir_blanc', label: 'Aldir Blanc' },
  { value: 'rouanet', label: 'Lei Rouanet' },
  { value: 'premio', label: 'Prêmios' },
  { value: 'other', label: 'Outros' },
];

const CATEGORY_LABELS: Record<PortalItem['category'], string> = {
  edital: 'Edital',
  festival: 'Festival',
  noticia: 'Notícia',
  aldir_blanc: 'Aldir Blanc',
  rouanet: 'Rouanet',
  premio: 'Prêmio',
  other: 'Outro',
};

const SCOPE_LABELS: Record<PortalItem['scope'], string> = {
  nacional: 'Nacional',
  estadual: 'Estadual',
  municipal: 'Municipal',
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
};

const suggestionKey = (item: CulturalNoticeSuggestion) => `${item.source}-${item.external_id}`;

const toPortalItem = (item: CulturalNoticeSuggestion): PortalItem => ({
  source: item.source,
  external_id: item.external_id,
  title: item.title,
  description: item.description,
  category: item.category,
  scope: item.scope,
  state: item.state,
  city: item.city,
  external_url: item.external_url,
  deadline: item.deadline,
  event_date: item.event_date,
  published_at: item.published_at,
});

const CulturalPortal: React.FC = () => {
  const [stateFilter, setStateFilter] = useState('MG');
  const [cityFilter, setCityFilter] = useState('Monte Carmelo');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PortalItem['category']>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [notices, setNotices] = useState<CulturalNoticeAdmin[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [suggestions, setSuggestions] = useState<CulturalNoticeSuggestion[]>([]);
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState<Set<string>>(new Set());

  // Create manual notice
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{
    title: string;
    source_url: string;
    source_name: string;
    summary: string;
    category: PortalItem['category'];
    state: string;
    city: string;
    deadline_at: string;
    event_date: string;
  }>({
    title: '',
    source_url: '',
    source_name: '',
    summary: '',
    category: 'noticia',
    state: stateFilter,
    city: cityFilter,
    deadline_at: '',
    event_date: '',
  });

  const openCreateModal = () => {
    setCreateForm(prev => ({ ...prev, state: stateFilter, city: cityFilter }));
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.state.trim()) return;
    try {
      setCreating(true);
      const created = await adminService.createCulturalNotice({
        title: createForm.title.trim(),
        category: createForm.category,
        state: createForm.state.trim().toUpperCase(),
        city: createForm.city.trim() || null,
        summary: createForm.summary.trim() || null,
        source_name: createForm.source_name.trim() || null,
        source_url: createForm.source_url.trim() || null,
        deadline_at: createForm.deadline_at || null,
        event_date: createForm.event_date || null,
        is_active: true,
      });
      setNotices(prev => [created, ...prev]);
      showToast.success('Notícia publicada com sucesso.');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        source_url: '',
        source_name: '',
        summary: '',
        category: 'noticia',
        state: stateFilter,
        city: cityFilter,
        deadline_at: '',
        event_date: '',
      });
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setCreating(false);
    }
  };

  const loadNotices = useCallback(async () => {
    try {
      setLoadingNotices(true);
      const data = await adminService.listCulturalNotices({
        state: stateFilter.trim().toUpperCase() || undefined,
        city: cityFilter.trim() || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      });
      setNotices(data ?? []);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoadingNotices(false);
    }
  }, [categoryFilter, cityFilter, stateFilter]);

  const loadSuggestions = useCallback(async () => {
    const normalizedState = stateFilter.trim().toUpperCase();
    if (normalizedState.length !== 2) {
      showToast.error('Informe a UF com 2 letras para buscar sugestões.');
      return;
    }

    try {
      setLoadingSuggestions(true);
      const data = await adminService.listCulturalNoticeSuggestions({
        state: normalizedState,
        city: cityFilter.trim() || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        limit: 24,
      });
      setSuggestions(data.items ?? []);
      setSelectedSuggestionKeys(new Set());
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [categoryFilter, cityFilter, stateFilter]);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const activeCount = useMemo(() => notices.filter(item => item.is_active).length, [notices]);
  const inactiveCount = notices.length - activeCount;
  const visibleNotices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return notices;
    return notices.filter(item =>
      [item.title, item.summary, item.source_name, item.city, item.state]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [notices, searchTerm]);

  const selectedSuggestions = useMemo(() => {
    if (!selectedSuggestionKeys.size) return [];
    return suggestions.filter(
      item => selectedSuggestionKeys.has(suggestionKey(item)) && !item.already_published
    );
  }, [selectedSuggestionKeys, suggestions]);

  const handleToggleSuggestion = (item: CulturalNoticeSuggestion) => {
    if (item.already_published) return;
    const key = suggestionKey(item);
    setSelectedSuggestionKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePublishSelected = async () => {
    if (!selectedSuggestions.length) {
      showToast.error('Selecione ao menos uma sugestão para publicar.');
      return;
    }

    try {
      setPublishing(true);
      const result = await adminService.importCulturalNoticeSuggestions({
        items: selectedSuggestions.map(toPortalItem),
        state: stateFilter.trim().toUpperCase() || undefined,
        city: cityFilter.trim() || undefined,
        activate: true,
      });
      showToast.success(
        `Curadoria atualizada: ${result.created} criados, ${result.updated} atualizados.`
      );
      setSelectedSuggestionKeys(new Set());
      await Promise.all([loadNotices(), loadSuggestions()]);
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleActive = async (notice: CulturalNoticeAdmin) => {
    try {
      const updated = await adminService.updateCulturalNotice(notice.id, {
        is_active: !notice.is_active,
      });
      setNotices(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      showToast.success(updated.is_active ? 'Notícia ativada.' : 'Notícia desativada.');
    } catch (error) {
      showToast.apiError(error);
    }
  };

  const handleDelete = async (notice: CulturalNoticeAdmin) => {
    const confirmed = window.confirm(`Remover "${notice.title}" da curadoria?`);
    if (!confirmed) return;
    try {
      await adminService.deleteCulturalNotice(notice.id);
      setNotices(prev => prev.filter(item => item.id !== notice.id));
      showToast.success('Conteúdo removido.');
    } catch (error) {
      showToast.apiError(error);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHero
        title="Portal Cultural Premium"
        description="Selecione notícias, editais e festivais por localidade para alimentar o app com curadoria editorial."
        stats={[
          { label: 'Itens Curados', value: notices.length, icon: Newspaper },
          { label: 'Ativos no App', value: activeCount, icon: CheckCircle2 },
          { label: 'Ocultos', value: inactiveCount, icon: ToggleLeft },
        ]}
      />

      <AdminCard className="space-y-4 border border-cyan-500/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-white font-semibold text-lg">Curadoria por Localidade</h2>
            <p className="text-slate-400 text-sm">
              Defina região e categoria para publicar somente o conteúdo relevante aos músicos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminButton variant="secondary" onClick={loadNotices}>
              Atualizar lista
            </AdminButton>
            <AdminButton variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
              Nova notícia
            </AdminButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="admin-label">UF</label>
            <input
              className="admin-input"
              value={stateFilter}
              maxLength={2}
              onChange={e => setStateFilter(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="MG"
            />
          </div>
          <div>
            <label className="admin-label">Cidade (opcional)</label>
            <input
              className="admin-input"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              placeholder="Monte Carmelo"
            />
          </div>
          <div>
            <label className="admin-label">Categoria</label>
            <select
              className="admin-select"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as 'all' | PortalItem['category'])}
            >
              {CATEGORY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:pt-6">
            <AdminButton variant="primary" onClick={loadNotices} className="w-full">
              Aplicar filtros
            </AdminButton>
          </div>
        </div>
      </AdminCard>

      <AdminCard className="space-y-4 border border-indigo-500/20 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/40">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Radar de Fontes Públicas
            </h2>
            <p className="text-slate-400 text-sm">
              Busque sugestões externas e publique somente as selecionadas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminButton variant="secondary" onClick={loadSuggestions} loading={loadingSuggestions}>
              Buscar sugestões
            </AdminButton>
            <AdminButton
              variant="success"
              onClick={handlePublishSelected}
              loading={publishing}
              disabled={!selectedSuggestions.length}
            >
              Publicar selecionadas ({selectedSuggestions.length})
            </AdminButton>
          </div>
        </div>

        {loadingSuggestions ? (
          <AdminLoading count={2} />
        ) : suggestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-400">
            Execute a busca de sugestões para revisar notícias e editais externos.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {suggestions.map((item, index) => {
              const key = suggestionKey(item);
              const selected = selectedSuggestionKeys.has(key);
              const isLocked = item.already_published;
              const locationLabel = [item.city, item.state].filter(Boolean).join(' · ') || 'Brasil';
              return (
                <motion.button
                  key={key}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleToggleSuggestion(item)}
                  className={`text-left rounded-2xl border p-4 transition-all min-h-[164px] ${
                    selected
                      ? 'border-cyan-400/60 bg-cyan-500/10'
                      : 'border-white/10 bg-slate-900/50 hover:border-cyan-500/30'
                  } ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={isLocked}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                        {SCOPE_LABELS[item.scope]}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                        {item.source_label}
                      </span>
                    </div>
                    {isLocked ? (
                      <span className="text-[11px] text-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Publicada
                      </span>
                    ) : (
                      <span
                        className={`text-[11px] inline-flex items-center gap-1 ${
                          selected ? 'text-cyan-200' : 'text-slate-400'
                        }`}
                      >
                        <ToggleRight className="h-3.5 w-3.5" />
                        {selected ? 'Selecionada' : 'Selecionar'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-white font-semibold leading-snug">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-slate-300 mt-2 line-clamp-2">{item.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Globe2 className="h-3.5 w-3.5" />
                      {formatDate(item.published_at) ?? 'Sem data'}
                    </span>
                    {item.external_url && (
                      <span className="inline-flex items-center gap-1 text-cyan-300">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Link oficial
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </AdminCard>

      <AdminCard className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-white font-semibold text-lg">Conteúdo publicado no app</h2>
          <div className="min-w-[260px] w-full sm:w-auto">
            <AdminSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por título, fonte ou cidade..."
            />
          </div>
        </div>

        {loadingNotices ? (
          <AdminLoading count={3} />
        ) : visibleNotices.length === 0 ? (
          <AdminEmptyState icon={Newspaper} title="Nenhum conteúdo publicado para esse filtro" />
        ) : (
          <div className="space-y-3">
            {visibleNotices.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          item.is_active
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {item.is_active ? 'Ativo no feed' : 'Oculto'}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold">{item.title}</h3>
                    {item.summary && (
                      <p className="text-sm text-slate-300 mt-1 line-clamp-2">{item.summary}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      {[item.city, item.state].filter(Boolean).join(' · ')} · Publicado em{' '}
                      {formatDate(item.published_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleActive(item)}
                    >
                      {item.is_active ? (
                        <>
                          <ToggleLeft className="h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <ToggleRight className="h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </AdminButton>
                    <AdminButton variant="danger" size="sm" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </AdminButton>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AdminCard>

      {/* Modal: Nova Notícia Manual */}
      <AdminModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova notícia"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <AdminButton variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={!createForm.title.trim() || !createForm.state.trim()}
            >
              Publicar
            </AdminButton>
          </div>
        }
      >
        <div className="space-y-4">
          {/* URL */}
          <div>
            <label className="admin-label">URL do link</label>
            <input
              className="admin-input"
              type="url"
              value={createForm.source_url}
              onChange={e => setCreateForm(prev => ({ ...prev, source_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          {/* Título */}
          <div>
            <label className="admin-label">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              className="admin-input"
              type="text"
              value={createForm.title}
              onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Edital de Apoio à Música Independente 2025"
            />
          </div>

          {/* Resumo */}
          <div>
            <label className="admin-label">Resumo (opcional)</label>
            <textarea
              className="admin-input resize-none"
              rows={2}
              value={createForm.summary}
              onChange={e => setCreateForm(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Breve descrição para exibição no app..."
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="admin-label">Categoria</label>
            <select
              className="admin-select"
              value={createForm.category}
              onChange={e =>
                setCreateForm(prev => ({
                  ...prev,
                  category: e.target.value as PortalItem['category'],
                }))
              }
            >
              {FORM_CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Localidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">
                UF <span className="text-red-400">*</span>
              </label>
              <input
                className="admin-input"
                type="text"
                maxLength={2}
                value={createForm.state}
                onChange={e =>
                  setCreateForm(prev => ({
                    ...prev,
                    state: e.target.value.toUpperCase().slice(0, 2),
                  }))
                }
                placeholder="MG"
              />
            </div>
            <div>
              <label className="admin-label">Cidade (opcional)</label>
              <input
                className="admin-input"
                type="text"
                value={createForm.city}
                onChange={e => setCreateForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Ex: Monte Carmelo"
              />
            </div>
          </div>

          {/* Fonte e datas */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
              Mais detalhes (opcional)
            </p>
            <div>
              <label className="admin-label">Nome da fonte</label>
              <input
                className="admin-input"
                type="text"
                value={createForm.source_name}
                onChange={e => setCreateForm(prev => ({ ...prev, source_name: e.target.value }))}
                placeholder="Ex: Prefeitura, MinC, Secult"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="admin-label">Prazo de inscrição</label>
                <input
                  className="admin-input"
                  type="date"
                  value={createForm.deadline_at}
                  onChange={e =>
                    setCreateForm(prev => ({ ...prev, deadline_at: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="admin-label">Data do evento</label>
                <input
                  className="admin-input"
                  type="date"
                  value={createForm.event_date}
                  onChange={e =>
                    setCreateForm(prev => ({ ...prev, event_date: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </AdminModal>
    </div>
  );
};

export default CulturalPortal;
