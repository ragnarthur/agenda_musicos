// utils/tokenStorage.ts

// Tokens ficam somente em memoria para reduzir exposicao a XSS.
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const getStoredAccessToken = (): string | null => {
  return accessToken;
};

export const setStoredAccessToken = (token?: string | null): void => {
  accessToken = token ?? null;
};

export const getStoredRefreshToken = (): string | null => {
  return refreshToken;
};

export const setStoredRefreshToken = (token?: string | null): void => {
  refreshToken = token ?? null;
};

export const clearStoredAccessToken = (): void => {
  accessToken = null;
};

export const clearStoredRefreshToken = (): void => {
  refreshToken = null;
};
