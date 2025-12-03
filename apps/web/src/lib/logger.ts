/**
 * Simple logger utility for Epic Scribe
 *
 * - In production: only logs errors and warnings
 * - In development: logs everything
 * - Provides consistent formatting with prefixes
 */

const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (prefix: string, message: string, ...args: unknown[]) => void;
  info: (prefix: string, message: string, ...args: unknown[]) => void;
  warn: (prefix: string, message: string, ...args: unknown[]) => void;
  error: (prefix: string, message: string, ...args: unknown[]) => void;
}

function formatMessage(prefix: string, message: string): string {
  return `[${prefix}] ${message}`;
}

export const logger: Logger = {
  debug: (prefix: string, message: string, ...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(formatMessage(prefix, message), ...args);
    }
  },

  info: (prefix: string, message: string, ...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(formatMessage(prefix, message), ...args);
    }
  },

  warn: (prefix: string, message: string, ...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn(formatMessage(prefix, message), ...args);
  },

  error: (prefix: string, message: string, ...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(formatMessage(prefix, message), ...args);
  },
};

export default logger;
