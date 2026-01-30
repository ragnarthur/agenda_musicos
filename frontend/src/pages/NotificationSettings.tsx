// pages/NotificationSettings.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  Check,
  X,
  Copy,
  RefreshCw,
  ChevronLeft,
  Send,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout/Layout';
import Loading from '../components/common/Loading';
import {
  notificationService,
  type NotificationPreference,
  type TelegramConnectResponse,
} from '../services/api';
import { logError } from '../utils/logger';
import { getErrorMessage } from '../utils/toast';

const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Telegram connection state
  const [telegramCode, setTelegramCode] = useState<TelegramConnectResponse | null>(null);
  const [, setConnectingTelegram] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.getPreferences();
      setPreferences(data);
    } catch (error) {
      logError('Erro ao carregar preferencias:', error);
      toast.error(getErrorMessage(error, 'Erro ao carregar preferências de notificação'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Polling para verificar conexao do Telegram
  useEffect(() => {
    if (!telegramCode) return;

    const interval = setInterval(async () => {
      try {
        const status = await notificationService.telegramStatus();
        if (status.connected) {
          setTelegramCode(null);
          toast.success('Telegram conectado com sucesso!');
          loadPreferences();
        }
      } catch (error) {
        logError('Erro ao verificar status:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [telegramCode, loadPreferences]);

  const handleUpdatePreference = async (
    key: keyof NotificationPreference,
    value: boolean | string
  ) => {
    if (!preferences) return;

    try {
      setSaving(true);
      const updated = await notificationService.updatePreferences({ [key]: value });
      setPreferences(updated);
      toast.success('Preferência atualizada');
    } catch (error) {
      logError('Erro ao atualizar:', error);
      toast.error(getErrorMessage(error, 'Erro ao atualizar preferência'));
    } finally {
      setSaving(false);
    }
  };

  const handleConnectTelegram = async () => {
    try {
      setConnectingTelegram(true);
      const response = await notificationService.telegramConnect();
      setTelegramCode(response);
    } catch (error) {
      logError('Erro ao iniciar conexao:', error);
      toast.error(getErrorMessage(error, 'Erro ao gerar código de conexão'));
    } finally {
      setConnectingTelegram(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    try {
      setSaving(true);
      await notificationService.telegramDisconnect();
      toast.success('Telegram desconectado');
      loadPreferences();
    } catch (error) {
      logError('Erro ao desconectar:', error);
      toast.error(getErrorMessage(error, 'Erro ao desconectar Telegram'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (telegramCode?.code) {
      navigator.clipboard.writeText(telegramCode.code);
      toast.success('Código copiado!');
    }
  };

  const handleCheckStatus = async () => {
    try {
      setCheckingStatus(true);
      const status = await notificationService.telegramStatus();
      if (status.connected) {
        setTelegramCode(null);
        toast.success('Telegram conectado!');
        loadPreferences();
      } else {
        toast('Aguardando conexão...', { icon: '⏳' });
      }
    } catch (error) {
      logError('Erro ao verificar status:', error);
      toast.error(getErrorMessage(error, 'Erro ao verificar status'));
    } finally {
      setCheckingStatus(false);
    }
  };

  const channelIcons: Record<string, React.ReactNode> = {
    email: <Mail className="h-5 w-5" />,
    telegram: <Send className="h-5 w-5" />,
    whatsapp: <MessageCircle className="h-5 w-5" />,
    sms: <Smartphone className="h-5 w-5" />,
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading text="Carregando preferencias..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <Bell className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Notificações</h1>
              <p className="text-slate-300">Gerencie como você recebe alertas de eventos</p>
            </div>
          </div>
        </div>

        {/* Canal Preferido */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Canal Preferido</h2>
          <p className="text-slate-300 text-sm mb-4">
            Escolha como deseja receber as notificações de convites e eventos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {preferences?.available_channels
              .filter(ch => ch.available)
              .map(channel => {
                const isSelected = preferences.preferred_channel === channel.id;
                const isConnected = channel.connected;

                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      if (isConnected) {
                        handleUpdatePreference('preferred_channel', channel.id);
                      } else if (channel.id === 'telegram') {
                        handleConnectTelegram();
                      }
                    }}
                    disabled={saving || (!isConnected && channel.id !== 'telegram')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-violet-500 bg-violet-500/10'
                        : isConnected
                          ? 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                          : 'border-slate-700 bg-slate-800/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {channelIcons[channel.id]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}
                          >
                            {channel.name}
                          </span>
                          {isConnected && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                              Conectado
                            </span>
                          )}
                          {!isConnected && channel.id === 'telegram' && (
                            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                              Conectar
                            </span>
                          )}
                        </div>
                        {!isConnected && channel.id !== 'telegram' && (
                          <span className="text-xs text-slate-400">Em breve</span>
                        )}
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-violet-400" />}
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Fallback para email */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences?.fallback_to_email ?? true}
                onChange={e => handleUpdatePreference('fallback_to_email', e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500"
              />
              <div>
                <span className="text-slate-200">Usar email como fallback</span>
                <p className="text-xs text-slate-400">
                  Se o canal preferido falhar, enviar por email
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Telegram Connection Modal */}
        {telegramCode && (
          <div className="bg-gradient-to-br from-sky-500/10 to-blue-500/10 rounded-xl p-6 border border-sky-500/30 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/20 rounded-lg">
                  <Send className="h-5 w-5 text-sky-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Conectar Telegram</h3>
              </div>
              <button
                onClick={() => setTelegramCode(null)}
                className="text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-300 text-sm mb-3">Seu código de verificação:</p>
                <div className="flex items-center gap-3">
                  <code className="text-3xl font-mono font-bold text-white tracking-widest">
                    {telegramCode.code}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    title="Copiar código"
                  >
                    <Copy className="h-5 w-5 text-slate-200" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Expira em {telegramCode.expires_in_minutes} minutos
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-slate-200 font-medium">Instruções:</p>
                <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
                  <li>Abra o Telegram no seu celular</li>
                  <li>
                    Busque por{' '}
                    <a
                      href={`https://t.me/${telegramCode.bot_username.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                    >
                      {telegramCode.bot_username}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    Envie a mensagem:{' '}
                    <code className="text-white bg-slate-700 px-2 py-0.5 rounded">
                      {telegramCode.code}
                    </code>
                  </li>
                </ol>
              </div>

              <button
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                {checkingStatus ? 'Verificando...' : 'Já enviei o código'}
              </button>
            </div>
          </div>
        )}

        {/* Telegram Conectado */}
        {preferences?.telegram_connected && !telegramCode && (
          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-green-400 font-medium">Telegram conectado</p>
                  <p className="text-sm text-slate-300">Você receberá notificações no Telegram</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConnectTelegram}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors"
                >
                  Reconectar
                </button>
                <button
                  onClick={handleDisconnectTelegram}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Desconectar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tipos de Notificacao */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-4">Tipos de Notificação</h2>
          <p className="text-slate-300 text-sm mb-4">Escolha quais notificações deseja receber.</p>

          <div className="space-y-3">
            {[
              {
                key: 'notify_event_invites',
                label: 'Convites para eventos',
                description: 'Quando alguém te convida para um show',
              },
              {
                key: 'notify_availability_responses',
                label: 'Respostas de disponibilidade',
                description: 'Quando um músico responde ao seu convite',
              },
              {
                key: 'notify_event_confirmations',
                label: 'Confirmações de eventos',
                description: 'Quando um evento é confirmado ou cancelado',
              },
              {
                key: 'notify_event_reminders',
                label: 'Lembretes de eventos',
                description: 'Lembretes antes dos shows (em breve)',
                disabled: true,
              },
            ].map(item => (
              <label
                key={item.key}
                className={`flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl cursor-pointer hover:bg-slate-700/50 transition-colors ${
                  item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={preferences?.[item.key as keyof NotificationPreference] as boolean}
                  onChange={e => {
                    if (!item.disabled) {
                      handleUpdatePreference(
                        item.key as keyof NotificationPreference,
                        e.target.checked
                      );
                    }
                  }}
                  disabled={item.disabled || saving}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500"
                />
                <div className="flex-1">
                  <span className="text-slate-100">{item.label}</span>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotificationSettings;
