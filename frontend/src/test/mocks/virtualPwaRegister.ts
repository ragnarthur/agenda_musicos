export type RegisterSWOptions = {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void;
  onRegisterError?: (error: unknown) => void;
};

// Vitest: stub do virtual module `virtual:pwa-register` (o plugin nao roda no ambiente de testes).
export function registerSW(_opts?: RegisterSWOptions) {
  return async (_reloadPage?: boolean) => undefined;
}

