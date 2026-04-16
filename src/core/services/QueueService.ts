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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, dbFirebase } from '../database/firebase';

const WEBHOOK_QUEUE_KEY = '@webhook_queue_mascotify';
const FOTO_QUEUE_KEY = '@foto_queue_mascotify';

// Google Sheets webhook — mismo endpoint que el de inventario
const getSheetsWebhookUrl = () => process.env.EXPO_PUBLIC_SHEETS_WEBHOOK_URL || '';
const getAppToken = () => process.env.EXPO_PUBLIC_APP_TOKEN || '';

// Mapeo de estados de la app al valor exacto de la columna P de Logistica
const APP_ESTADO_TO_SHEETS: Record<string, string> = {
    Pendiente:  'Pendiente',
    Picking:    'En proceso',
    En_Tienda:  'Listo para envio',
    Entregado:  'Entregado',
};

const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || '';
const getAuthToken = () => process.env.EXPO_PUBLIC_AUTH_TOKEN || '';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  codigoBarras: string;
  nuevoStock?: number;
  nuevoFV?: string;
  nuevoFechaEdicion?: string;
  nuevoComentario?: string;
}

export interface FotoUploadJob {
  pedidoId: string;    // ID del doc en Firestore (colección 'pedidos')
  codPedido: string;   // Código legible del pedido (ej. 'PED-001') para notificar Sheets
  localUri: string;    // URI absoluta en FileSystem.documentDirectory
  storagePath: string; // Ruta destino en Firebase Storage
  urlFoto?: string;    // URL Firebase Storage (disponible tras upload)
}

// ─── QueueService ─────────────────────────────────────────────────────────────

export const QueueService = {

  // ── Webhook (inventario) ─────────────────────────────────────────────────

  async encolar(payload: WebhookPayload): Promise<void> {
    try {
      const cola = await this.leer();
      cola.push(payload);
      await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(cola));
      console.log(`[Queue] Webhook encolado. Total: ${cola.length}`);
    } catch (error) {
      console.error('[Queue] Error al encolar webhook:', error);
    }
  },

  async leer(): Promise<WebhookPayload[]> {
    try {
      const raw = await AsyncStorage.getItem(WEBHOOK_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async contarPendientes(): Promise<number> {
    return (await this.leer()).length;
  },

  async procesarCola(): Promise<number> {
    const cola = await this.leer();
    if (cola.length === 0) return 0;

    console.log(`[Queue] Procesando ${cola.length} webhook(s)...`);
    const restantes: WebhookPayload[] = [];

    for (const item of cola) {
      const ok = await this._intentarEnvio(item);
      if (!ok) restantes.push(item);
    }

    await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify(restantes));
    console.log(`[Queue] ${cola.length - restantes.length} enviado(s). ${restantes.length} pendiente(s).`);
    return restantes.length;
  },

  async vaciar(): Promise<void> {
    await AsyncStorage.setItem(WEBHOOK_QUEUE_KEY, JSON.stringify([]));
  },

  async _intentarEnvio(payload: WebhookPayload): Promise<boolean> {
    try {
      const res = await fetch(getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'X-Auth-Token': getAuthToken(),
        },
        body: JSON.stringify({ accion: 'webhook_modificacion', datos: payload, token: getAuthToken() }),
      });
      const txt = await res.text();
      return txt.includes('"status":"success"');
    } catch {
      return false;
    }
  },

  // ── Foto Upload (logística) ───────────────────────────────────────────────

  async encolarFoto(job: FotoUploadJob): Promise<void> {
    try {
      const cola = await this.leerFotos();
      cola.push(job);
      await AsyncStorage.setItem(FOTO_QUEUE_KEY, JSON.stringify(cola));
      console.log(`[FotoQueue] Job encolado: ${job.pedidoId}. Total: ${cola.length}`);
    } catch (error) {
      console.error('[FotoQueue] Error al encolar foto:', error);
    }
  },

  async leerFotos(): Promise<FotoUploadJob[]> {
    try {
      const raw = await AsyncStorage.getItem(FOTO_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async contarFotosPendientes(): Promise<number> {
    return (await this.leerFotos()).length;
  },

  /**
   * Procesa la cola de fotos pendientes.
   * Cada job hace 3 pasos atómicos: subir → actualizar Firestore → borrar local.
   * Si cualquier paso falla, el job permanece en cola para reintento.
   */
  async procesarColaFotos(): Promise<number> {
    const cola = await this.leerFotos();
    if (cola.length === 0) return 0;

    console.log(`[FotoQueue] Procesando ${cola.length} foto(s)...`);
    const restantes: FotoUploadJob[] = [];

    for (const job of cola) {
      const ok = await this._procesarFotoJob(job);
      if (!ok) restantes.push(job);
    }

    await AsyncStorage.setItem(FOTO_QUEUE_KEY, JSON.stringify(restantes));
    console.log(`[FotoQueue] ${cola.length - restantes.length} subida(s). ${restantes.length} pendiente(s).`);
    return restantes.length;
  },

  /**
   * Paso A: leer archivo local como blob
   * Paso B: subir a Firebase Storage
   * Paso C: obtener URL pública y actualizar Firestore
   * Paso D: borrar archivo local
   * Paso E: notificar Google Sheets con nuevo estado → 'Entregado'
   */
  async _procesarFotoJob(job: FotoUploadJob): Promise<boolean> {
    try {
      // Verificar que el archivo local existe
      const info = await FileSystem.getInfoAsync(job.localUri);
      if (!info.exists) {
        console.warn(`[FotoQueue] Archivo no existe, descartando job: ${job.localUri}`);
        return true; // Descartamos — no tiene sentido reintentar
      }

      // Paso A+B: leer como base64 y subir a Storage
      const base64 = await FileSystem.readAsStringAsync(job.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const storageRef = ref(storage, job.storagePath);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Paso C: actualizar Firestore con la URL y estado definitivo
      const pedidoRef = doc(dbFirebase, 'pedidos', job.pedidoId);
      await updateDoc(pedidoRef, {
        url_foto: downloadURL,
        estado: 'Entregado',
        server_updated_at: Date.now(),
      });

      // Paso D: borrar archivo local para no colapsar la memoria del dispositivo
      await FileSystem.deleteAsync(job.localUri, { idempotent: true });
      console.log(`[FotoQueue] Job completado para pedido ${job.pedidoId}`);

      // Paso E: notificar Google Sheets (sin bloquear — si falla, no aborta el job)
      if (job.codPedido) {
        this._notificarSheetsEntrega(job.codPedido, job.urlFoto ?? downloadURL).catch(
          (e) => console.warn('[FotoQueue] Sheets notify fail (non-blocking):', e)
        );
      }

      return true;

    } catch (error) {
      console.error(`[FotoQueue] Fallo en job ${job.pedidoId}:`, error);
      return false;
    }
  },

  /**
   * Llama al webhook de Google Sheets para actualizar el estado del pedido
   * en la columna P de la hoja Logistica.
   */
  async _notificarSheetsEntrega(codPedido: string, urlFoto: string): Promise<void> {
    const webhookUrl = getSheetsWebhookUrl();
    if (!webhookUrl) {
      console.warn('[Sheets Notify] EXPO_PUBLIC_SHEETS_WEBHOOK_URL no configurado, saltando.');
      return;
    }
    const payload = {
      accion: 'webhook_entrega',
      token: getAppToken(),
      datos: {
        codPedido,
        nuevoEstado: APP_ESTADO_TO_SHEETS['Entregado'], // 'Entregado'
        urlFoto,
      },
    };
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const txt = await res.text();
    console.log(`[Sheets Notify] CodPedido=${codPedido} → estado Entregado. Resp: ${txt.slice(0, 80)}`);
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
