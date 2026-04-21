// src/core/services/LoggerService.ts
import { database } from '../database';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: string;
  timestamp: number;
}

export class Logger {
  private static instance: Logger;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  static debug(message: string, context?: Record<string, any>) {
    if (__DEV__) {
      Logger.getInstance().log('debug', message, context);
    }
  }

  static info(message: string, context?: Record<string, any>) {
    Logger.getInstance().log('info', message, context);
  }

  static warn(message: string, context?: Record<string, any>) {
    Logger.getInstance().log('warn', message, context);
  }

  static error(message: string, error?: Error, context?: Record<string, any>) {
    Logger.getInstance().log('error', message, {
      ...context,
      errorMessage: error?.message,
      errorStack: error?.stack,
    });
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ) {
    const timestamp = Date.now();
    
    // 1. Console
    if (level === 'error') {
      console.error(`[ERROR] ${message}`, context);
    } else if (level === 'warn') {
      console.warn(`[WARN] ${message}`, context);
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }

    // 2. Database Persistence (Optional, enabled if table exists)
    try {
      await database.write(async () => {
        await (database.get('logs') as any).create((log: any) => {
          log.level = level;
          log.message = message;
          log.context = JSON.stringify(context || {});
          log.timestamp = timestamp;
        });
      });
    } catch (e) {
      // Table might not exist yet, fail silently
    }
  }
}
