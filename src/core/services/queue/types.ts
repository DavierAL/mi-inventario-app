// src/core/services/queue/types.ts

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';

export type JobType = 'webhook' | 'foto';

export interface WebhookPayload {
  codigoBarras: string;
  nuevoStock?: number;
  nuevoFV?: string;
  nuevoFechaEdicion?: string;
  nuevoComentario?: string;
}

export interface FotoUploadJob {
  pedidoId: string;
  codPedido: string;
  localUri: string;
  storagePath: string;
  urlFoto?: string;
}

export type QueueJobPayload = WebhookPayload | FotoUploadJob;

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
