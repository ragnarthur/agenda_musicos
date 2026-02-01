// utils/tokenStorage.ts

const ACCESS_TOKEN_KEY = 'gigflow_access_token';
const REFRESH_TOKEN_KEY = 'gigflow_refresh_token';

export const getStoredAccessToken = (): string | null => {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setStoredAccessToken = (token?: string | null): void => {
  if (!token) return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const getStoredRefreshToken = (): string | null => {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setStoredRefreshToken = (token?: string | null): void => {
  if (!token) return;
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const clearStoredAccessToken = (): void => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const clearStoredRefreshToken = (): void => {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};
