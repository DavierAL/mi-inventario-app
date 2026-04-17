// ARCHIVO: src/core/services/QueueService.ts
/**
 * QueueService — Cola offline con soporte para trabajos compuestos.
 *
 * Tipo 'webhook'    → HTTP POST a Google Sheets (comportamiento anterior).
 * Tipo 'upload_foto' → Tres pasos atómicos:
 *   A. Subir imagen local a Firebase Storage.
 *   B. Actualizar doc en Firestore con url_foto.
 *   C. Borrar la foto local (FileSystem.deleteAsync).
 */
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../database/supabase';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import OutboxJob from '../database/models/OutboxJob';

// Configuración de Supabase Storage
const getSupabaseConfig = () => ({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  bucket: 'pedidos',
});

// Mapeo de estados de la app al valor exacto de la columna P de Logistica
const APP_ESTADO_TO_SHEETS: Record<string, string> = {
    Pendiente:  'Pendiente',
    Picking:    'En proceso',
    En_Tienda:  'Listo para envio',
    Entregado:  'Entregado',
};

// Webhooks URL (Supabase Edge Function)
const getApiUrl = () => process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL || '';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  codigoBarras: string;
  nuevoStock?: number;
  nuevoFV?: string;
  nuevoFechaEdicion?: string;
  nuevoComentario?: string;
}

export interface FotoUploadJob {
  pedidoId: string;    // ID del registro en Supabase (tabla 'pedidos')
  codPedido: string;   // Código legible del pedido (ej. 'PED-001')
  localUri: string;    // URI absoluta local
  storagePath: string; // Ruta destino en Supabase Storage
  urlFoto?: string;    // URL pública final
}

// ─── QueueService ─────────────────────────────────────────────────────────────

export const QueueService = {

  // ── Webhook (inventario) ─────────────────────────────────────────────────

  async encolar(payload: WebhookPayload): Promise<void> {
    try {
      await database.write(async () => {
        await database.get<OutboxJob>('outbox_jobs').create((job: OutboxJob) => {
          job.payload = JSON.stringify(payload);
          job.jobType = 'webhook';
          job.status = 'PENDING';
        });
      });
      console.log('[Queue] Webhook encolado en SQLite');
    } catch (error) {
      console.error('[Queue] Error al encolar webhook:', error);
    }
  },

  async leer(): Promise<OutboxJob[]> {
    return database.get<OutboxJob>('outbox_jobs')
      .query(Q.where('job_type', 'webhook'), Q.where('status', 'PENDING'))
      .fetch();
  },

  async contarPendientes(): Promise<number> {
    return await database.get<OutboxJob>('outbox_jobs')
      .query(Q.where('job_type', 'webhook'), Q.where('status', 'PENDING'))
      .fetchCount();
  },

  async procesarCola(): Promise<number> {
    const jobs = await this.leer();
    if (jobs.length === 0) return 0;

    console.log(`[Queue] Procesando ${jobs.length} webhook(s)...`);
    let remaining = jobs.length;

    for (const job of jobs) {
      const payload = JSON.parse(job.payload) as WebhookPayload;
      const ok = await this._intentarEnvio(payload);
      if (ok) {
        await database.write(async () => {
          await job.update((j: OutboxJob) => { j.status = 'COMPLETED'; });
        });
        remaining--;
      }
    }

    console.log(`[Queue] webhooks enviados. ${remaining} pendiente(s).`);
    return remaining;
  },

  async vaciar(): Promise<void> {
    const jobs = await this.leer();
    await database.write(async () => {
      for (const j of jobs) await j.destroyPermanently();
    });
  },

  async _intentarEnvio(payload: WebhookPayload): Promise<boolean> {
    try {
      const res = await fetch(getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      return txt.includes('"status":"success"');
    } catch {
      return false;
    }
  },

  // ── Foto Upload (logística) ───────────────────────────────────────────────

  async encolarFoto(jobData: FotoUploadJob): Promise<void> {
    try {
      await database.write(async () => {
        await database.get<OutboxJob>('outbox_jobs').create((job: OutboxJob) => {
          job.payload = JSON.stringify(jobData);
          job.jobType = 'foto';
          job.status = 'PENDING';
        });
      });
      console.log(`[FotoQueue] Job encolado en SQLite: ${jobData.pedidoId}`);
    } catch (error) {
      console.error('[FotoQueue] Error al encolar foto:', error);
    }
  },

  async leerFotos(): Promise<OutboxJob[]> {
    return database.get<OutboxJob>('outbox_jobs')
      .query(Q.where('job_type', 'foto'), Q.where('status', 'PENDING'))
      .fetch();
  },

  async contarFotosPendientes(): Promise<number> {
    return await database.get<OutboxJob>('outbox_jobs')
      .query(Q.where('job_type', 'foto'), Q.where('status', 'PENDING'))
      .fetchCount();
  },

  async procesarColaFotos(): Promise<number> {
    const jobs = await this.leerFotos();
    if (jobs.length === 0) return 0;

    console.log(`[FotoQueue] Procesando ${jobs.length} foto(s)...`);
    let remaining = jobs.length;

    for (const jobModel of jobs) {
      const payload = JSON.parse(jobModel.payload) as FotoUploadJob;
      const ok = await this._procesarFotoJob(payload);
      if (ok) {
        await database.write(async () => {
          await jobModel.update((j: OutboxJob) => { j.status = 'COMPLETED'; });
        });
        remaining--;
      }
    }

    console.log(`[FotoQueue] fotos subidas. ${remaining} pendiente(s).`);
    return remaining;
  },

  async _procesarFotoJob(job: FotoUploadJob): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(job.localUri);
      if (!info.exists) {
        console.warn(`[FotoQueue] Archivo no existe, descartando job: ${job.localUri}`);
        return true;
      }

      const { url, key, bucket } = getSupabaseConfig();
      // Endpoint de Supabase Storage para upload
      const uploadUrl = `${url}/storage/v1/object/${bucket}/${job.storagePath}`;

      console.log(`[FotoQueue] Subiendo a Supabase: ${uploadUrl}`);

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, job.localUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 
          'Authorization': `Bearer ${key}`,
          'apikey': key,
          'Content-Type': 'image/jpeg' 
        },
      });

      console.log(`[FotoQueue] Upload status: ${uploadResult.status}`);

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`Supabase Storage upload HTTP ${uploadResult.status}: ${uploadResult.body}`);
      }

      // Obtener URL pública (asumiendo que el bucket es público)
      const downloadURL = `${url}/storage/v1/object/public/${bucket}/${job.storagePath}`;

      // Paso C: actualizar tabla 'pedidos' en Supabase
      const { error: dbError } = await supabase
        .from('pedidos')
        .update({
          url_foto: downloadURL,
          estado: 'Entregado',
          updated_at: Date.now(),
        })
        .eq('id', job.pedidoId);

      if (dbError) throw dbError;

      // Paso D: borrar archivo local
      await FileSystem.deleteAsync(job.localUri, { idempotent: true });
      console.log(`[FotoQueue] Job completado para pedido ${job.pedidoId}`);

      // Paso E: notificar Google Sheets
      if (job.codPedido) {
        this._notificarSheetsEntrega(job.codPedido, downloadURL).catch(
          (e) => console.warn('[FotoQueue] Sheets notify fail:', e)
        );
      }

      return true;

    } catch (error) {
      console.error(`[FotoQueue] Fallo en job ${job.pedidoId}:`, error);
      return false;
    }
  },

  // ── Helpers Varios ──────────────────────────────────────────────────────

  async _notificarSheetsEntrega(codPedido: string, urlFoto: string): Promise<void> {
    const webhookUrl = getApiUrl();
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'logistica_entrega',
          codigo_pedido: codPedido,
          url_foto: urlFoto,
          timestamp: Date.now(),
        }),
      });
    } catch (e) {
      // silencioso
    }
  },

  /**
   * Procesa ambas colas (webhooks + fotos) al recuperar conexión.
   */
  async procesarTodo(): Promise<void> {
    await Promise.all([
      this.procesarCola(),
      this.procesarColaFotos(),
    ]);
  },
};
