// services/api.ts - Configuração base do Axios
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  clearStoredAccessToken,
  clearStoredRefreshToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
} from '../utils/tokenStorage';
import { ADMIN_ROUTES } from '../routes/adminRoutes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Instância principal da API
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // Supports CSRF mitigation when backend falls back to cookie-based auth.
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Instância dedicada para uploads (sem Content-Type fixo)
export const uploadApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

let refreshingPromise: Promise<void> | null = null;

const shouldFallbackToStoredRefresh = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  const detail = (error.response?.data as { detail?: string } | undefined)?.detail || '';
  return status === 401 && detail.toLowerCase().includes('refresh token ausente');
};

const refreshAuthToken = async (): Promise<void> => {
  if (!refreshingPromise) {
    const doRefresh = async () => {
      const storedRefresh = getStoredRefreshToken();

      try {
        // Tenta refresh com cookie primeiro (pré-rotado)
        const response = await axios.post(
          `${API_URL}/token/refresh/`,
          {},
          { withCredentials: true }
        );
        setStoredAccessToken((response.data as { access?: string } | undefined)?.access);
        setStoredRefreshToken((response.data as { refresh?: string } | undefined)?.refresh);
        return;
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;

        // Se o refresh com cookie falhar com 401 ou mensagem específica, tenta com o token armazenado
        if ((status === 401 || shouldFallbackToStoredRefresh(error)) && storedRefresh) {
          const response = await axios.post(
            `${API_URL}/token/refresh/`,
            { refresh: storedRefresh },
            { withCredentials: true }
          );
          setStoredAccessToken((response.data as { access?: string } | undefined)?.access);
          setStoredRefreshToken((response.data as { refresh?: string } | undefined)?.refresh);
        } else {
          throw error;
        }
      }
    };

    refreshingPromise = doRefresh()
      .then(() => {
        refreshingPromise = null;
      })
      .catch(() => {
        // Não limpa refreshingPromise em caso de erro para evitar burst de requisições
        // Aguarda 5 segundos antes de permitir nova tentativa
        setTimeout(() => {
          refreshingPromise = null;
        }, 5000);
      });
  }
  return refreshingPromise;
};

// Interceptor para injetar Authorization quando houver access token armazenado
api.interceptors.request.use(config => {
  const accessToken = getStoredAccessToken();
  if (accessToken) {
    const headers = config.headers ?? {};
    headers.Authorization = `Bearer ${accessToken}`;
    config.headers = headers;
  }
  return config;
});

// Interceptor para refresh de token
api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    // Endpoints públicos (não autenticados) não devem redirecionar para login
    const publicAuthPaths = [
      '/token/',
      '/token/refresh/',
      '/token/logout/',
      '/register/',
      '/check-email/',
      '/verify-email/',
      '/resend-verification/',
      '/password-reset/',
      '/password-reset-confirm/',
      '/admin/token/',
      '/admin/me/',
      '/contractor/token/',
      '/auth/google/',
      '/auth/google/register-musician/',
    ];

    const isPublicAuthPath = originalRequest?.url
      ? publicAuthPaths.some(path => originalRequest.url?.includes(path))
      : false;

    const publicRoutes = [
      '/',
      '/login',
      '/cadastro',
      '/contratante/login',
      '/contratante/cadastro',
      '/solicitar-acesso',
      '/cidades',
      '/musico',
      '/verificar-email',
      '/esqueci-senha',
      '/redefinir-senha',
      ADMIN_ROUTES.login,
    ];
    // Careful: every pathname starts with '/', so '/' must be an exact match.
    const isOnPublicRoute = publicRoutes.some(route =>
      route === '/' ? window.location.pathname === '/' : window.location.pathname.startsWith(route)
    );

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isPublicAuthPath) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        await refreshAuthToken();
        return api(originalRequest);
      } catch (refreshError) {
        // Limpar tokens inválidos para evitar loop infinito
        clearStoredAccessToken();
        clearStoredRefreshToken();

        const isUserProfileCall = originalRequest.url?.includes('/musicians/me/');

        // Em rotas públicas, não redirecionamos para login (ex: verificação de email)
        if (!isPublicAuthPath && !isOnPublicRoute && !isUserProfileCall) {
          toast.error('Sessão expirada. Faça login novamente.');
          setTimeout(() => {
            if (
              window.location.pathname.startsWith('/admin') &&
              !window.location.pathname.startsWith(ADMIN_ROUTES.login)
            ) {
              window.location.href = ADMIN_ROUTES.login;
            } else if (window.location.pathname.startsWith('/contratante')) {
              window.location.href = '/contratante/login';
            } else {
              window.location.href = '/login';
            }
          }, 1500);
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 403) {
      if (!isPublicAuthPath) {
        toast.error('Acesso negado.');
      }

      if (window.location.pathname.startsWith(ADMIN_ROUTES.base)) {
        clearStoredAccessToken();
        clearStoredRefreshToken();
        window.location.href = ADMIN_ROUTES.login;
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Re-export de serviços e tipos para manter compatibilidade
export { authService } from './authService';
export { adminService } from './adminService';
export {
  musicianService,
  type InstrumentOption,
  type ConnectionStatusResponse,
} from './musicianService';
// eventService/connectionService são importados diretamente para evitar chunks circulares
export { badgeService, type BadgeProgressResponse } from './badgeService';
export { leaderAvailabilityService } from './leaderAvailabilityService';
export { marketplaceService } from './marketplaceService';
export {
  notificationService,
  type NotificationPreference,
  type TelegramConnectResponse,
} from './notificationService';
export { registrationService } from './registrationService';
