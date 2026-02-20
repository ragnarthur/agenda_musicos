// services/api.ts - Configuração base do Axios
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { clearStoredAccessToken, clearStoredRefreshToken } from '../utils/tokenStorage';
import { ADMIN_ROUTES } from '../routes/adminRoutes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Instância principal da API
export const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
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
  timeout: 60_000,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

let refreshingPromise: Promise<void> | null = null;
let refreshBlockedUntil = 0;
let lastRefreshError: unknown = null;
let sessionExpiryHandlingInProgress = false;
const REFRESH_RETRY_COOLDOWN_MS = 5000;

const refreshAuthToken = async (): Promise<void> => {
  const now = Date.now();
  if (!refreshingPromise && refreshBlockedUntil > now) {
    return Promise.reject(lastRefreshError ?? new Error('Refresh em cooldown'));
  }

  if (!refreshingPromise) {
    const doRefresh = async () => {
      await axios.post(`${API_URL}/token/refresh/`, {}, { withCredentials: true });
    };

    refreshingPromise = doRefresh()
      .then(() => {
        refreshBlockedUntil = 0;
        lastRefreshError = null;
      })
      .catch(error => {
        refreshBlockedUntil = Date.now() + REFRESH_RETRY_COOLDOWN_MS;
        lastRefreshError = error;
        throw error;
      })
      .finally(() => {
        refreshingPromise = null;
      });
  }
  return refreshingPromise;
};

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
        if (
          !sessionExpiryHandlingInProgress &&
          !isPublicAuthPath &&
          !isOnPublicRoute &&
          !isUserProfileCall
        ) {
          sessionExpiryHandlingInProgress = true;
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
export { marketplaceService } from './marketplaceService';
export {
  notificationService,
  type NotificationPreference,
  type TelegramConnectResponse,
} from './notificationService';
export { registrationService } from './registrationService';
