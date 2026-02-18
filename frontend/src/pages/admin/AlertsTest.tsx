import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bug, ExternalLink, Send } from 'lucide-react';
import { AdminButton, AdminCard, AdminHero } from '../../components/admin';
import { ADMIN_ROUTES } from '../../routes/adminRoutes';
import { Sentry } from '../../utils/sentry';
import { showToast } from '../../utils/toast';

const getMaskedDsn = (dsn: string): string => {
  try {
    const parsed = new URL(dsn);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return 'Formato inválido';
  }
};

const AlertsTest: React.FC = () => {
  const [confirmText, setConfirmText] = useState('');
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [lastTestKey, setLastTestKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
  const sentryEnabled = dsn.length > 0;

  const handleSendControlledError = async () => {
    if (confirmText !== 'DISPARAR') {
      showToast.error('Digite DISPARAR para confirmar o teste.');
      return;
    }

    if (!sentryEnabled) {
      showToast.error('VITE_SENTRY_DSN não está configurado neste build.');
      return;
    }

    setSending(true);
    try {
      const testKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const error = new Error(`[GLITCHTIP_EMAIL_TEST] controlled:${testKey}`);
      const eventId = Sentry.captureException(error, {
        tags: {
          source: 'admin-alert-test',
          test_type: 'controlled',
        },
        level: 'error',
        extra: {
          test_key: testKey,
          route: window.location.pathname,
          triggered_at: new Date().toISOString(),
        },
      });

      Sentry.flush(2000).catch(() => undefined);

      setLastEventId(eventId || null);
      setLastTestKey(testKey);
      showToast.success('Evento de teste enviado para GlitchTip.');
    } catch (error) {
      showToast.apiError(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHero
        title="Teste de Alertas (GlitchTip)"
        description="Dispara um erro controlado para validar evento e e-mail de alerta."
      />

      <AdminCard className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
          <div className="space-y-1 text-sm text-amber-100">
            <p className="font-semibold">Use somente em ambiente de produção e com acesso admin.</p>
            <p>
              O teste gera uma issue de erro com marcador <code>[GLITCHTIP_EMAIL_TEST]</code>.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ambiente</p>
            <p className="mt-1 text-sm font-semibold text-white">{import.meta.env.MODE}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sentry/GlitchTip DSN
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {sentryEnabled ? 'Ativo' : 'Não configurado'}
            </p>
            {sentryEnabled && <p className="mt-1 text-xs text-slate-300">{getMaskedDsn(dsn)}</p>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-3">
          <p className="text-sm text-slate-300">
            Para evitar disparos acidentais, digite <code>DISPARAR</code> para liberar o botão.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={event => setConfirmText(event.target.value.toUpperCase())}
            className="admin-input max-w-xs"
            placeholder="DISPARAR"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="flex flex-wrap items-center gap-3">
            <AdminButton
              variant="danger"
              icon={Bug}
              onClick={handleSendControlledError}
              loading={sending}
              disabled={!sentryEnabled}
            >
              Enviar erro de teste
            </AdminButton>

            <Link
              to={ADMIN_ROUTES.dashboard}
              className="btn-admin-secondary px-4 py-2 min-h-[44px] inline-flex items-center gap-2 font-medium"
            >
              Voltar ao dashboard
            </Link>

            <a
              href="https://glitchtip.com/"
              target="_blank"
              rel="noreferrer"
              className="btn-admin-ghost px-4 py-2 min-h-[44px] inline-flex items-center gap-2 font-medium"
            >
              Abrir GlitchTip
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </AdminCard>

      {(lastEventId || lastTestKey) && (
        <AdminCard className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-300">
            <Send className="h-4 w-4" />
            <p className="font-semibold">Último disparo registrado</p>
          </div>
          {lastTestKey && (
            <p className="text-sm text-slate-200">
              Chave de teste: <code>{lastTestKey}</code>
            </p>
          )}
          {lastEventId && (
            <p className="text-sm text-slate-200">
              Event ID: <code>{lastEventId}</code>
            </p>
          )}
          <p className="text-xs text-slate-400">
            Se o e-mail não chegar, revise as regras de alerta no projeto do GlitchTip.
          </p>
        </AdminCard>
      )}
    </div>
  );
};

export default AlertsTest;
