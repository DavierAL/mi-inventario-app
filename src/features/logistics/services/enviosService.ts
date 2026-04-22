// src/features/logistics/services/enviosService.ts
/**
 * EnviosService — Servicio de logística con soporte directo a Supabase.
 * Maneja: subida de fotos, actualización de estado, notificación a Sheets.
 */

import { supabase } from '../../../core/database/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { Logger } from '../../../core/services/LoggerService';
import { decode } from 'base64-arraybuffer';
import Envio from '../../../core/database/models/Envio';

export const EnviosService = {

  /**
   * Sube la foto de entrega (POD) a Supabase Storage.
   * Retorna la URL pública del archivo.
   */
  async subirFotoPOD(localUri: string, codPedido: string): Promise<string | null> {
    try {
      const storagePath = `pedidos/${codPedido}/pod_${Date.now()}.jpg`;

      Logger.info('[EnviosService] Subiendo foto POD', { codPedido, storagePath });

      // Leer el archivo como base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Usamos decode de base64-arraybuffer para mayor compatibilidad en React Native
      const arrayBuffer = decode(base64);

      // Subir a Storage
      const { error } = await supabase.storage
        .from('evidencias')
        .upload(storagePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        Logger.error('[EnviosService] Error subiendo foto', new Error(error.message));
        return null;
      }

      // Obtener URL pública
      const { data } = supabase.storage
        .from('evidencias')
        .getPublicUrl(storagePath);

      const url = data?.publicUrl ?? storagePath;
      Logger.info('[EnviosService] Foto subida exitosamente', { url });
      return url;
    } catch (err) {
      Logger.error('[EnviosService] Error fatal al subir foto', err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  },

  /**
   * Actualiza el estado de un envío directamente en Supabase.
   * Esta es la llamada CRÍTICA que faltaba antes.
   */
  async actualizarEstado(params: {
    supabaseRowId: string;
    nuevoEstado: string;
    podUrl?: string;
  }): Promise<{ exito: boolean; error?: string }> {
    try {
      Logger.info('[EnviosService] Actualizando estado en Supabase', {
        envioId: params.supabaseRowId,
        nuevoEstado: params.nuevoEstado,
      });

      const updateData: Record<string, string | null> = {
        estado: Envio.toExternalStatus(params.nuevoEstado),
        updated_at: new Date().toISOString(),
      };

      if (params.podUrl) {
        updateData.pod_url = params.podUrl;
        // Se elimina la redundancia de sobrescribir url_foto para preservar la imagen del producto
      }

      const { error } = await supabase
        .from('envios')
        .update(updateData)
        .eq('id', params.supabaseRowId);

      if (error) {
        Logger.error('[EnviosService] Error actualizando Supabase', new Error(error.message));
        return { exito: false, error: error.message };
      }

      Logger.info('[EnviosService] Estado actualizado exitosamente', {
        envioId: params.supabaseRowId,
      });
      return { exito: true };
    } catch (err) {
      Logger.error('[EnviosService] Error fatal en update', err instanceof Error ? err : new Error(String(err)));
      return { exito: false, error: String(err) };
    }
  },

  /**
   * Notifica a Google Sheets vía Edge Function.
   * Se llama de forma NO-BLOQUEANTE (fire and forget).
   */
  async notificarSheets(supabaseRowId: string): Promise<void> {
    try {
      Logger.info('[EnviosService] Notificando Google Sheets', {
        envioId: supabaseRowId,
      });

      await supabase.functions.invoke('sync-logistica-sheets', {
        body: { envio_id: supabaseRowId },
      });

      Logger.info('[EnviosService] Google Sheets notificado');
    } catch (err) {
      // No bloquear el flujo si Sheets falla
      Logger.warn('[EnviosService] Advertencia: Sheets no respondió', { error: err } as Record<string, any>);
    }
  },
};

