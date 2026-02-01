// utils/tokenStorage.ts

const REFRESH_TOKEN_KEY = 'gigflow_refresh_token';

export const getStoredRefreshToken = (): string | null => {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setStoredRefreshToken = (token?: string | null): void => {
  if (!token) return;
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const clearStoredRefreshToken = (): void => {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};
