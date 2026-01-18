// utils/logger.ts
export const logError = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

export const logInfo = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};
