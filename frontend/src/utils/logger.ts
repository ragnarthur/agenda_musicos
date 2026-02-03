// utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  timestamp: string;
  level: LogLevel;
  module?: string;
}

const formatLog = (level: LogLevel, context: LogContext, ...args: unknown[]) => {
  const timestamp = context.timestamp || new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}${context.module ? `][${context.module}` : ''}`;
  return [prefix, ...args];
};

const shouldLog = (level: LogLevel): boolean => {
  // Em produção, só loga errors
  if (!import.meta.env.DEV) {
    return level === 'error';
  }
  return true;
};

export const logger = {
  debug: (module: string, ...args: unknown[]) => {
    if (shouldLog('debug')) {
      const context: LogContext = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        module,
      };
      console.log(...formatLog('debug', context, ...args));
    }
  },

  info: (module: string, ...args: unknown[]) => {
    if (shouldLog('info')) {
      const context: LogContext = {
        timestamp: new Date().toISOString(),
        level: 'info',
        module,
      };
      console.log(...formatLog('info', context, ...args));
    }
  },

  warn: (module: string, ...args: unknown[]) => {
    if (shouldLog('warn')) {
      const context: LogContext = {
        timestamp: new Date().toISOString(),
        level: 'warn',
        module,
      };
      console.warn(...formatLog('warn', context, ...args));
    }
  },

  error: (module: string, ...args: unknown[]) => {
    if (shouldLog('error')) {
      const context: LogContext = {
        timestamp: new Date().toISOString(),
        level: 'error',
        module,
      };
      console.error(...formatLog('error', context, ...args));
    }
  },
};

// Backward compatibility
export const logError = (module: string, ...args: unknown[]) => {
  logger.error(module, ...args);
};

export const logInfo = (module: string, ...args: unknown[]) => {
  logger.info(module, ...args);
};
