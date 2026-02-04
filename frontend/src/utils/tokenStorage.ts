// utils/tokenStorage.ts

const ACCESS_TOKEN_KEY = 'gigflow_access_token';

// Refresh token fica somente em memoria para reduzir exposicao a XSS.
let refreshToken: string | null = null;

export const getStoredAccessToken = (): string | null => {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setStoredAccessToken = (token?: string | null): void => {
  if (!token) return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const getStoredRefreshToken = (): string | null => {
  return refreshToken;
};

export const setStoredRefreshToken = (token?: string | null): void => {
  refreshToken = token ?? null;
};

export const clearStoredAccessToken = (): void => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const clearStoredRefreshToken = (): void => {
  refreshToken = null;
};
