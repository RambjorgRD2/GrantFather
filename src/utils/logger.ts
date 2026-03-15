// Logger utility for production-safe logging
const isDevelopment = process.env.NODE_ENV === 'development';

interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Get current log level from environment or default to INFO in production
const getCurrentLogLevel = (): number => {
  if (isDevelopment) {
    return LOG_LEVELS.DEBUG;
  }
  
  const envLevel = process.env.REACT_APP_LOG_LEVEL;
  if (envLevel && envLevel in LOG_LEVELS) {
    return LOG_LEVELS[envLevel as keyof LogLevel];
  }
  
  return LOG_LEVELS.INFO; // Default to INFO in production
};

const currentLogLevel = getCurrentLogLevel();

class Logger {
  private shouldLog(level: number): boolean {
    return level >= currentLogLevel;
  }

  debug(...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error('[ERROR]', ...args);
    }
  }

  // Special method for auth-related logs (always logged in development)
  auth(...args: any[]): void {
    if (isDevelopment || this.shouldLog(LOG_LEVELS.INFO)) {
      console.log('[AUTH]', ...args);
    }
  }

  // Special method for performance logs
  perf(...args: any[]): void {
    if (isDevelopment || this.shouldLog(LOG_LEVELS.INFO)) {
      console.log('[PERF]', ...args);
    }
  }

  // Special method for security logs (always logged)
  security(...args: any[]): void {
    console.warn('[SECURITY]', ...args);
  }
}

export const logger = new Logger();

// Export individual methods for convenience
export const { debug, info, warn, error, auth, perf, security } = logger;

// Utility to replace console.log statements
export const replaceConsoleLog = () => {
  if (!isDevelopment) {
    // In production, disable console.log
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    // Keep console.warn and console.error for actual errors
  }
};

// Initialize logger
if (typeof window !== 'undefined') {
  // Only run in browser environment
  replaceConsoleLog();
}
