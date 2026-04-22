// src/core/services/queue/index.ts
export * from './types';
export * from './PersistentQueue';
export * from './QueueRetryStrategy';
export * from './QueueProcessor';
export * from './jobHandlers';

import { queueProcessor } from './QueueProcessor';
import { PersistentQueue } from './PersistentQueue';

const persistentQueue = new PersistentQueue();

import { WebhookPayload, FotoUploadJob, EstadoEnvioJob } from './types';

/**
 * Convenience functions for the rest of the app to enqueue jobs
 * without needing to know about the internal classes.
 */
export const QueueActions = {
  enqueueWebhook: (payload: WebhookPayload) => persistentQueue.enqueue('webhook', payload),
  enqueueFoto: (payload: FotoUploadJob) => persistentQueue.enqueue('foto', payload),
  enqueueEstadoEnvio: (payload: EstadoEnvioJob) => persistentQueue.enqueue('ESTADO_ENVIO', payload),
  getStats: () => persistentQueue.getStats(),
};


export const initializeQueueProcessor = () => {
  queueProcessor.start();
};
