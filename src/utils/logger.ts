/**
 * Centralized logging utility with environment-aware behavior
 * In production, logs are suppressed. In development, all logs are shown.
 */

const isDevelopment = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  /** Force log even in production (use sparingly) */
  force?: boolean;
  /** Additional context/metadata */
  context?: Record<string, unknown>;
}

/**
 * Log a debug message (only in development)
 */
export const logDebug = (message: string, data?: unknown, options?: LogOptions): void => {
  if (isDevelopment || options?.force) {
    console.log(`[DEBUG] ${message}`, data !== undefined ? data : '', options?.context || '');
  }
};

/**
 * Log an info message (only in development)
 */
export const logInfo = (message: string, data?: unknown, options?: LogOptions): void => {
  if (isDevelopment || options?.force) {
    console.info(`[INFO] ${message}`, data !== undefined ? data : '', options?.context || '');
  }
};

/**
 * Log a warning message (only in development by default)
 */
export const logWarn = (message: string, data?: unknown, options?: LogOptions): void => {
  if (isDevelopment || options?.force) {
    console.warn(`[WARN] ${message}`, data !== undefined ? data : '', options?.context || '');
  }
};

/**
 * Log an error message (always logs, even in production)
 * Errors should always be logged for debugging production issues
 */
export const logError = (message: string, error?: unknown, options?: LogOptions): void => {
  console.error(`[ERROR] ${message}`, error !== undefined ? error : '', options?.context || '');
};

/**
 * Generic log function with configurable level
 */
export const log = (level: LogLevel, message: string, data?: unknown, options?: LogOptions): void => {
  switch (level) {
    case 'debug':
      logDebug(message, data, options);
      break;
    case 'info':
      logInfo(message, data, options);
      break;
    case 'warn':
      logWarn(message, data, options);
      break;
    case 'error':
      logError(message, data, options);
      break;
  }
};

/**
 * Create a logger instance with a prefix for a specific module/component
 */
export const createLogger = (prefix: string) => ({
  debug: (message: string, data?: unknown, options?: LogOptions) => 
    logDebug(`[${prefix}] ${message}`, data, options),
  info: (message: string, data?: unknown, options?: LogOptions) => 
    logInfo(`[${prefix}] ${message}`, data, options),
  warn: (message: string, data?: unknown, options?: LogOptions) => 
    logWarn(`[${prefix}] ${message}`, data, options),
  error: (message: string, error?: unknown, options?: LogOptions) => 
    logError(`[${prefix}] ${message}`, error, options),
});

export default {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  log,
  createLogger,
};
