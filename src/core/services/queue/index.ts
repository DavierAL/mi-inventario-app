// src/core/services/queue/index.ts
export * from './types';
export * from './PersistentQueue';
export * from './QueueRetryStrategy';
export * from './QueueProcessor';
export * from './jobHandlers';

import { queueProcessor } from './QueueProcessor';
import { PersistentQueue } from './PersistentQueue';

const persistentQueue = new PersistentQueue();

/**
 * Convenience functions for the rest of the app to enqueue jobs
 * without needing to know about the internal classes.
 */
export const QueueActions = {
  enqueueWebhook: (payload: any) => persistentQueue.enqueue('webhook', payload),
  enqueueFoto: (payload: any) => persistentQueue.enqueue('foto', payload),
  getStats: () => persistentQueue.getStats(),
};

export const initializeQueueProcessor = () => {
  queueProcessor.start();
};
