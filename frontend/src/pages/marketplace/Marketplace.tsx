import React from 'react';
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
  PencilLine,
  Trash2,
  ArrowUp,
  CheckCircle2,
  Users,
  Ban,
  MessageCircle,
  Eraser,
} from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import { SkeletonCard } from '../../components/common/Skeleton';
import PullToRefresh from '../../components/common/PullToRefresh';
import ConfirmModal from '../../components/modals/ConfirmModal';
import type { MarketplaceGig, MarketplaceGigChatMessage } from '../../types';
import CreateGigModal from './components/CreateGigModal';
import { STATUS_STYLES, STATUS_LABEL } from './types';
import {
  GIG_HISTORY_WINDOW_DAYS,
  GIG_HISTORY_STATUSES,
  isGigInHistoryWindow,
  normalizeCityKey,
  formatDate,
  formatDateTime,
  formatCurrency,
  parseCurrencyValue,
  formatTime,
  normalizeCurrency,
} from './utils';
import { useMarketplace } from './useMarketplace';

export default function Marketplace() {
  const m = useMarketplace();

  const now = new Date();
  const cityFilterKey = normalizeCityKey(m.cityFilter);
  const gigsByCity = m.gigs.filter(gig => {
    if (!cityFilterKey) return true;
    return normalizeCityKey(gig.city).startsWith(cityFilterKey);
  });
  const activeVisibleGigs = gigsByCity.filter(gig => !GIG_HISTORY_STATUSES.has(gig.status));
  const historicalVisibleGigs = gigsByCity.filter(gig => isGigInHistoryWindow(gig, now));
  const visibleGigs =
    m.mainGigViewMode === 'active'
      ? activeVisibleGigs
      : m.mainGigViewMode === 'history'
        ? historicalVisibleGigs
        : [...activeVisibleGigs, ...historicalVisibleGigs];
  const historicalVisibleGigIds = new Set(historicalVisibleGigs.map(gig => gig.id));

  const myGigs = m.gigs.filter(gig => gig.created_by === m.user?.user.id);
  const myActiveGigs = myGigs.filter(gig => !GIG_HISTORY_STATUSES.has(gig.status));
  const myHistoricalGigs = myGigs.filter(gig => isGigInHistoryWindow(gig, now));
  const myVisibleGigs =
    m.myGigViewMode === 'active'
      ? myActiveGigs
      : m.myGigViewMode === 'history'
        ? myHistoricalGigs
        : [...myActiveGigs, ...myHistoricalGigs];

  const hasGigSchedule = (gig: MarketplaceGig): boolean =>
    Boolean(gig.event_date && gig.start_time && gig.end_time);

  const renderMyGigListButton = (gig: MarketplaceGig) => (
    <button
      key={gig.id}
      type="button"
      onClick={() => {
        const target = document.getElementById(`gig-${gig.id}`);
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 96;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }}
      className="w-full text-left border border-gray-100 rounded-lg p-3 transition hover:border-primary-200 hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-gray-900 truncate">{gig.title}</p>
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[gig.status] || 'bg-gray-100 text-gray-700'}`}
        >
          {STATUS_LABEL[gig.status] || gig.status}
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

  return (
    <Layout>
      <PullToRefresh onRefresh={m.loadData} disabled={m.loading}>
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

          {m.loading ? (
            <SkeletonCard count={3} />
          ) : m.error ? (
            <div className="card-contrast bg-red-50/80 border-red-200">
              <p className="text-red-800 mb-3">{m.error}</p>
              <button className="btn-primary" onClick={m.loadData}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-4">
                {/* City filter */}
                <div className="card-contrast border-primary-200/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Filtrar por cidade
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={m.cityFilter}
                        onChange={e => {
                          m.setCityFilterTouched(true);
                          m.setCityFilter(e.target.value);
                        }}
                        placeholder={m.user?.city ? `Ex: ${m.user.city}` : 'Ex: São Paulo'}
                      />
                      <p className="mt-2 text-xs text-gray-600">
                        {m.cityFilter?.trim()
                          ? `Mostrando: ${m.cityFilter.trim()}`
                          : 'Mostrando: todas as cidades'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {m.user?.city ? (
                        <button
                          type="button"
                          onClick={() => {
                            m.setCityFilterTouched(true);
                            m.setCityFilter(m.user?.city || '');
                          }}
                          className="btn-secondary"
                        >
                          Minha cidade
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          m.setCityFilterTouched(true);
                          m.setCityFilter('');
                        }}
                        className="btn-secondary"
                      >
                        Todas
                      </button>
                    </div>
                  </div>
                </div>

                {/* View mode selector */}
                <div className="card-contrast border-gray-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Exibição das vagas</h3>
                    <span className="text-xs text-gray-600">
                      {visibleGigs.length} resultado{visibleGigs.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(
                      [
                        { mode: 'active', label: `Abertas (${activeVisibleGigs.length})` },
                        { mode: 'history', label: `Histórico (${historicalVisibleGigs.length})` },
                        { mode: 'all', label: 'Todas' },
                      ] as const
                    ).map(({ mode, label }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => m.setMainGigViewMode(mode)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          m.mainGigViewMode === mode
                            ? mode === 'active'
                              ? 'border-primary-300 bg-primary-100 text-primary-800'
                              : mode === 'history'
                                ? 'border-slate-300 bg-slate-100 text-slate-800'
                                : 'border-gray-300 bg-gray-100 text-gray-800'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    {m.mainGigViewMode === 'active'
                      ? 'Foco nas vagas abertas, em avaliação e contratadas.'
                      : m.mainGigViewMode === 'history'
                        ? `Mostrando somente vagas encerradas dos últimos ${GIG_HISTORY_WINDOW_DAYS} dias.`
                        : 'Mostrando vagas ativas e histórico recente na mesma lista.'}
                  </p>
                </div>

                {/* Gig list */}
                {m.gigs.length === 0 ? (
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
                        : m.mainGigViewMode === 'active'
                          ? 'Não há vagas ativas para exibir.'
                          : m.mainGigViewMode === 'history'
                            ? `Não há vagas encerradas nos últimos ${GIG_HISTORY_WINDOW_DAYS} dias.`
                            : 'Não há vagas ativas nem histórico recente para exibir.'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          m.setCityFilterTouched(true);
                          m.setCityFilter('');
                        }}
                        className="btn-primary"
                      >
                        Ver todas as cidades
                      </button>
                      {m.user?.city ? (
                        <button
                          type="button"
                          onClick={() => {
                            m.setCityFilterTouched(true);
                            m.setCityFilter(m.user?.city || '');
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
                      m.mainGigViewMode === 'all' &&
                      isHistoricalGig &&
                      (!previousGig || !historicalVisibleGigIds.has(previousGig.id));
                    const applyForm = m.applyForms[gig.id] || {
                      cover_letter: '',
                      expected_fee: '',
                    };
                    const normalizedApplyFee = normalizeCurrency(applyForm.expected_fee || '');
                    const applyFeeValue = normalizedApplyFee ? Number(normalizedApplyFee) : 0;
                    const canApply = gig.status === 'open' || gig.status === 'in_review';
                    const isOwner = gig.created_by === m.user?.user.id;
                    const ownerApplications = m.getOwnerApplications(gig);
                    const applicationsVisible = !!m.applicationsOpen[gig.id];
                    const ownerPendingApplications = ownerApplications.filter(
                      app => app.status === 'pending'
                    );
                    const canCloseGig = !['closed', 'cancelled'].includes(gig.status);
                    const canHire = ['open', 'in_review'].includes(gig.status);
                    const canHireWithSchedule = canHire && hasGigSchedule(gig);
                    const selectedIds = m.selectedApplicationsByGig[gig.id] || [];
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
                          {/* Gig header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500">
                                  {gig.created_by_name || 'Cliente'}
                                </p>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[gig.status] || 'bg-gray-100 text-gray-700'}`}
                                >
                                  {STATUS_LABEL[gig.status] || gig.status}
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
                                    onClick={() => m.toggleApplications(gig)}
                                    className="inline-flex items-center gap-1 rounded-full border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-700 hover:border-primary-300 hover:text-primary-800 transition-colors"
                                  >
                                    <Users className="h-3.5 w-3.5" />
                                    {applicationsVisible ? 'Ocultar' : 'Candidaturas'}
                                  </button>
                                  {canCloseGig ? (
                                    <button
                                      type="button"
                                      onClick={() => m.setCloseTarget({ gig, status: 'closed' })}
                                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:border-amber-300 hover:text-amber-800 transition-colors"
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                      Encerrar
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => m.openEditModal(gig)}
                                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-primary-200 hover:text-primary-700 transition-colors"
                                  >
                                    <PencilLine className="h-3.5 w-3.5" />
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => m.setDeleteTarget(gig)}
                                    className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-300 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Excluir
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Gig details */}
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

                          {/* Actions / Applications / Chat */}
                          <div className="mt-4 border-t border-gray-100 pt-3 space-y-3">
                            {isOwner ? (
                              <div className="space-y-3">
                                {/* Owner info banner */}
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

                                {/* Bulk hire */}
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
                                          m.setHireTarget({
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
                                        onClick={() => m.clearApplicationSelection(gig.id)}
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

                                {/* Applications list */}
                                {applicationsVisible ? (
                                  <div className="rounded-lg border border-gray-100 p-3">
                                    {m.applicationsLoading[gig.id] ? (
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
                                          const appChatVisible = !!m.chatOpen[application.id];
                                          const appChatMessages = m.chatByApp[application.id] || [];
                                          const appChatDraft =
                                            m.chatDraftByApp[application.id] || '';
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
                                                        m.toggleApplicationSelection(
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
                                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[application.status] || 'bg-gray-100 text-gray-700'}`}
                                                >
                                                  {STATUS_LABEL[application.status] ||
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
                                                      m.setHireTarget({
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
                                                      m.toggleAppChat(gig.id, application.id)
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

                                              {/* Chat panel */}
                                              {appChatVisible && canChat ? (
                                                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/30 p-3 space-y-3 dark:bg-blue-950/20 dark:border-blue-900">
                                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                                                      Chat com {application.musician_name}
                                                    </p>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        m.requestClearAppChat(
                                                          gig.id,
                                                          application.id,
                                                          application.musician_name
                                                        )
                                                      }
                                                      disabled={m.chatClearing[application.id]}
                                                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:border-rose-300 disabled:opacity-60 transition-colors"
                                                    >
                                                      {m.chatClearing[application.id] ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : (
                                                        <Eraser className="h-3 w-3" />
                                                      )}
                                                      Apagar
                                                    </button>
                                                  </div>
                                                  <div className="max-h-56 overflow-y-auto rounded-lg border border-blue-100 bg-white dark:bg-gray-900 dark:border-blue-900 p-2 space-y-2">
                                                    {m.chatLoading[application.id] ? (
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
                                                            msg.sender === m.user?.user.id;
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
                                                        m.handleChatDraftChange(
                                                          application.id,
                                                          e.target.value
                                                        )
                                                      }
                                                      maxLength={600}
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        m.handleSendChatMessage(
                                                          gig.id,
                                                          application.id
                                                        )
                                                      }
                                                      disabled={
                                                        m.chatSending[application.id] ||
                                                        !appChatDraft.trim()
                                                      }
                                                      className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                      {m.chatSending[application.id] ? (
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
                                const myAppChatOpen = !!m.chatOpen[myAppId];
                                const myAppChatMessages = m.chatByApp[myAppId] || [];
                                const myAppChatDraft = m.chatDraftByApp[myAppId] || '';
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
                                          {STATUS_LABEL[gig.my_application!.status] ||
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
                                            onClick={() => m.toggleAppChat(gig.id, myAppId)}
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
                                              m.requestClearAppChat(
                                                gig.id,
                                                myAppId,
                                                gig.created_by_name || 'contratante'
                                              )
                                            }
                                            disabled={m.chatClearing[myAppId]}
                                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:border-rose-300 disabled:opacity-60 transition-colors"
                                          >
                                            {m.chatClearing[myAppId] ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <Eraser className="h-3 w-3" />
                                            )}
                                            Apagar
                                          </button>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto rounded-lg border border-blue-100 bg-white dark:bg-gray-900 dark:border-blue-900 p-2 space-y-2">
                                          {m.chatLoading[myAppId] ? (
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
                                                const isMine = msg.sender === m.user?.user.id;
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
                                              m.handleChatDraftChange(myAppId, e.target.value)
                                            }
                                            maxLength={600}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => m.handleSendChatMessage(gig.id, myAppId)}
                                            disabled={
                                              m.chatSending[myAppId] || !myAppChatDraft.trim()
                                            }
                                            className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                          >
                                            {m.chatSending[myAppId] ? (
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
                              /* Apply form */
                              <div className="space-y-2">
                                <textarea
                                  className="input-field"
                                  placeholder="Mensagem curta (repertório, disponibilidade, diferencial)"
                                  value={applyForm.cover_letter}
                                  onChange={e =>
                                    m.handleApplyChange(gig.id, 'cover_letter', e.target.value)
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
                                      m.handleApplyChange(gig.id, 'expected_fee', e.target.value)
                                    }
                                    inputMode="decimal"
                                    disabled={!canApply}
                                  />
                                  <button
                                    className="btn-primary w-full sm:w-auto flex items-center justify-center gap-1"
                                    onClick={() => m.handleApply(gig)}
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

              {/* Right sidebar */}
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
                    onClick={m.openCreateModal}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Megaphone className="h-4 w-4" />
                    Nova oportunidade
                  </button>
                </div>

                {/* My gigs */}
                <div className="card-contrast">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">Minhas vagas</h3>
                    {m.showBackToTop ? (
                      <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors"
                      >
                        Voltar ao topo
                      </button>
                    ) : null}
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {(
                      [
                        { mode: 'active', label: `Abertas (${myActiveGigs.length})` },
                        { mode: 'history', label: `Histórico (${myHistoricalGigs.length})` },
                        { mode: 'all', label: 'Todas' },
                      ] as const
                    ).map(({ mode, label }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => m.setMyGigViewMode(mode)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          m.myGigViewMode === mode
                            ? mode === 'active'
                              ? 'border-primary-300 bg-primary-100 text-primary-800'
                              : mode === 'history'
                                ? 'border-slate-300 bg-slate-100 text-slate-800'
                                : 'border-gray-300 bg-gray-100 text-gray-800'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {myActiveGigs.length === 0 && myHistoricalGigs.length === 0 ? (
                    <p className="text-sm text-gray-600">Você ainda não publicou nenhuma vaga.</p>
                  ) : myVisibleGigs.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      {m.myGigViewMode === 'active'
                        ? 'Você não possui vagas abertas no momento.'
                        : m.myGigViewMode === 'history'
                          ? `Você não possui vagas no histórico dos últimos ${GIG_HISTORY_WINDOW_DAYS} dias.`
                          : 'Não há vagas para exibir.'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {m.myGigViewMode === 'all' ? (
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

                {/* My applications summary */}
                <div className="card-contrast">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Minhas candidaturas</h3>
                  {Array.isArray(m.myApplications) && m.myApplications.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      Você ainda não se candidatou em nenhuma vaga.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(Array.isArray(m.myApplications) ? m.myApplications : []).map(app => (
                        <div key={app.id} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900 truncate">
                              {m.gigs.find(g => g.id === app.gig)?.title || 'Vaga'}
                            </p>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-700'}`}
                            >
                              {STATUS_LABEL[app.status] || app.status}
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

        {/* Create/Edit modal */}
        <CreateGigModal
          open={m.showCreateModal}
          editingGig={m.editingGig}
          form={m.form}
          setForm={m.setForm}
          creating={m.creating}
          cityQuery={m.cityQuery}
          setCityQuery={m.setCityQuery}
          cityOptions={m.cityOptions}
          cityOpen={m.cityOpen}
          setCityOpen={m.setCityOpen}
          cityLoading={m.cityLoading}
          cityFeedback={m.cityFeedback}
          duration={m.duration}
          setDuration={m.setDuration}
          customDuration={m.customDuration}
          setCustomDuration={m.setCustomDuration}
          setCustomDurationActive={m.setCustomDurationActive}
          isCustomDuration={m.isCustomDuration}
          onSubmit={m.handleSubmitGig}
          onClose={m.closeModal}
        />

        {/* Confirm modals */}
        <ConfirmModal
          isOpen={!!m.deleteTarget}
          onClose={() => m.setDeleteTarget(null)}
          onConfirm={m.handleDeleteGig}
          title="Excluir oportunidade"
          message="Tem certeza que deseja excluir esta oportunidade? Essa ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          confirmVariant="danger"
          loading={m.deleteLoading}
          icon={<Trash2 className="h-5 w-5" />}
        />

        <ConfirmModal
          isOpen={!!m.hireTarget}
          onClose={() => m.setHireTarget(null)}
          onConfirm={m.handleHire}
          title="Confirmar contratação"
          message={
            m.hireTarget ? (
              <div className="space-y-2">
                <p>
                  Deseja contratar {m.hireTarget.applications.length} músico
                  {m.hireTarget.applications.length > 1 ? 's' : ''} para a vaga "
                  {m.hireTarget.gig.title}"?
                </p>
                <ul className="list-disc pl-5">
                  {m.hireTarget.applications.map(app => (
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
          loading={m.hireLoading}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <ConfirmModal
          isOpen={!!m.closeTarget}
          onClose={() => m.setCloseTarget(null)}
          onConfirm={m.handleCloseGig}
          title="Encerrar vaga"
          message={
            m.closeTarget
              ? `Deseja encerrar a vaga "${m.closeTarget.gig.title}"? Candidaturas pendentes serão marcadas como recusadas e os músicos afetados serão notificados.`
              : ''
          }
          confirmText="Encerrar vaga"
          cancelText="Cancelar"
          confirmVariant="warning"
          loading={m.closeLoading}
          icon={<Ban className="h-5 w-5" />}
        />

        <ConfirmModal
          isOpen={!!m.clearChatTarget}
          onClose={() => m.setClearChatTarget(null)}
          onConfirm={m.handleConfirmClearAppChat}
          title="Apagar histórico do chat"
          message={
            m.clearChatTarget
              ? `Deseja apagar todo o histórico do chat com ${m.clearChatTarget.counterpartName}? Esta ação não pode ser desfeita.`
              : ''
          }
          confirmText="Apagar"
          cancelText="Cancelar"
          confirmVariant="danger"
          loading={
            m.clearChatTarget ? Boolean(m.chatClearing[m.clearChatTarget.applicationId]) : false
          }
          icon={<Eraser className="h-5 w-5" />}
        />

        {m.showBackToTop && !m.showCreateModal ? (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
}
