// services/notificationService.ts
import { api } from './api';

export interface NotificationChannelInfo {
  id: string;
  name: string;
  available: boolean;
  connected: boolean;
  configured: boolean;
}

export interface NotificationPreference {
  preferred_channel: string;
  fallback_to_email: boolean;
  telegram_chat_id: string | null;
  telegram_verified: boolean;
  telegram_connected: boolean;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  whatsapp_connected: boolean;
  notify_event_invites: boolean;
  notify_event_reminders: boolean;
  notify_event_confirmations: boolean;
  notify_availability_responses: boolean;
  available_channels: NotificationChannelInfo[];
  updated_at: string;
}

export interface TelegramConnectResponse {
  code: string;
  bot_username: string;
  expires_in_minutes: number;
  instructions: string;
}

export interface TelegramStatusResponse {
  connected: boolean;
}

export const notificationService = {
  getPreferences: async (): Promise<NotificationPreference> => {
    const response = await api.get('/notifications/preferences/');
    return response.data;
  },

  updatePreferences: async (
    payload: Partial<NotificationPreference>
  ): Promise<NotificationPreference> => {
    const response = await api.put('/notifications/preferences/', payload);
    return response.data;
  },

  telegramConnect: async (): Promise<TelegramConnectResponse> => {
    const response = await api.post('/notifications/telegram/connect/');
    return response.data;
  },

  telegramDisconnect: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/notifications/telegram/disconnect/');
    return response.data;
  },

  telegramStatus: async (): Promise<TelegramStatusResponse> => {
    const response = await api.get('/notifications/telegram/status/');
    return response.data;
  },
};
