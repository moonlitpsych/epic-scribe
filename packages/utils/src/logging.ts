/**
 * Logging utilities with PHI protection
 */

import { createSafeLogEntry } from './phi-redaction';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  metadata?: any;
}

export class Logger {
  private requestId?: string;
  private userId?: string;

  constructor(requestId?: string, userId?: string) {
    this.requestId = requestId;
    this.userId = userId;
  }

  private log(level: LogLevel, message: string, metadata?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      userId: this.userId,
      metadata: metadata ? createSafeLogEntry(metadata) : undefined,
    };

    // In production, send to logging service
    // For now, console log with appropriate level
    const logMethod = level === 'error' ? console.error :
                      level === 'warn' ? console.warn :
                      console.log;

    logMethod(JSON.stringify(entry));
  }

  debug(message: string, metadata?: any): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: any): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error | any, metadata?: any): void {
    const errorMetadata = {
      ...metadata,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };
    this.log('error', message, errorMetadata);
  }

  createChildLogger(additionalContext: { requestId?: string; userId?: string }): Logger {
    return new Logger(
      additionalContext.requestId || this.requestId,
      additionalContext.userId || this.userId
    );
  }
}

/**
 * Create a logger instance with request context
 */
export function createLogger(requestId?: string, userId?: string): Logger {
  return new Logger(requestId, userId);
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}