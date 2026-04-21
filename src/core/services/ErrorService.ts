// src/core/services/ErrorService.ts
import { Logger } from './LoggerService';
import Toast from 'react-native-toast-message';

export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  showToast?: boolean;
  [key: string]: any;
}

export class ErrorService {
  /**
   * Handle error with full logging and user feedback
   */
  static handle(error: unknown, context: ErrorContext = {}) {
    const err = error instanceof Error ? error : new Error(String(error));

    Logger.error(`Error: ${err.message}`, err, {
      component: context.component,
      operation: context.operation,
      userId: context.userId,
      ...context,
    });

    const userMessage = this.getUserMessage(err);

    if (context.showToast !== false) {
      Toast.show({
        type: 'error',
        text1: 'Ha ocurrido un problema',
        text2: userMessage,
      });
    }

    return {
      error: err,
      message: userMessage,
      context,
    };
  }

  /**
   * Get user-friendly message based on error type
   */
  private static getUserMessage(error: Error): string {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Error de conexión. Verifica tu internet.';
    }
    if (msg.includes('timeout')) {
      return 'La solicitud tardó demasiado. Intenta de nuevo.';
    }
    if (msg.includes('not found') || msg.includes('404')) {
      return 'Recurso no encontrado en el servidor.';
    }
    if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('401')) {
      return 'No tienes permiso para esta acción.';
    }
    return 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
  }

  /**
   * Helper for retrying async operations
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    delayMs = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts - 1) throw error;
        // Exponential backoff
        await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt)));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Identifies if an error is critical (e.g., DB corruption, Auth failure)
   */
  static isCritical(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('corrupt') || 
      msg.includes('unauthorized') || 
      msg.includes('permission') ||
      msg.includes('out of memory')
    );
  }
}
