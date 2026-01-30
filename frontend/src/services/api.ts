// services/api.ts - Configuração base do Axios
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Instância principal da API
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Instância dedicada para uploads (sem Content-Type fixo)
export const uploadApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let refreshingPromise: Promise<void> | null = null;

const refreshAuthToken = async (): Promise<void> => {
  if (!refreshingPromise) {
    refreshingPromise = axios
      .post(`${API_URL}/token/refresh/`, {}, { withCredentials: true })
      .then(() => {
        refreshingPromise = null;
      })
      .catch(error => {
        refreshingPromise = null;
        throw error;
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
      '/register/',
      '/check-email/',
      '/verify-email/',
      '/resend-verification/',
      '/password-reset/',
      '/password-reset-confirm/',
    ];

    const isPublicAuthPath = originalRequest?.url
      ? publicAuthPaths.some(path => originalRequest.url?.includes(path))
      : false;

    const publicRoutes = [
      '/login',
      '/cadastro',
      '/login-empresa',
      '/cadastro-empresa',
      '/solicitar-acesso',
      '/cidades',
      '/musico',
      '/verificar-email',
      '/esqueci-senha',
      '/redefinir-senha',
    ];
    const isOnPublicRoute = publicRoutes.some(route => window.location.pathname.startsWith(route));

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isPublicAuthPath) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        await refreshAuthToken();
        return api(originalRequest);
      } catch (refreshError) {
        const isUserProfileCall = originalRequest.url?.includes('/musicians/me/');

        // Em rotas públicas, não redirecionamos para login (ex: verificação de email)
        if (
          !isPublicAuthPath &&
          !isOnPublicRoute &&
          !isUserProfileCall &&
          window.location.pathname !== '/login'
        ) {
          toast.error('Sessão expirada. Faça login novamente.');
          setTimeout(() => {
            if (window.location.pathname.startsWith('/empresa')) {
              window.location.href = '/login-empresa';
            } else {
              window.location.href = '/login';
            }
          }, 1500);
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
