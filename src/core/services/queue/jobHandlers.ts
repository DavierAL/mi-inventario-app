// src/core/services/queue/jobHandlers.ts
import { supabase } from '../../database/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { WebhookPayload, FotoUploadJob, EstadoEnvioJob } from './types';
import { EnviosService } from '../../../features/logistics/services/enviosService';

const getApiUrl = () => process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL || '';

export const jobHandlers = {
  webhook: async (payload: WebhookPayload): Promise<boolean> => {
    const res = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
    }
    
    const txt = await res.text();
    try {
      const json = JSON.parse(txt);
      return json?.status === 'success';
    } catch (e) {
      console.warn('[Queue] Response not valid JSON:', txt);
      return false;
    }
  },

  foto: async (job: FotoUploadJob): Promise<boolean> => {
    const info = await FileSystem.getInfoAsync(job.localUri);
    if (!info.exists) {
      console.warn(`[Queue] File does not exist, discarding job: ${job.localUri}`);
      return true; // Discard
    }

    const base64 = await FileSystem.readAsStringAsync(job.localUri, { 
      encoding: FileSystem.EncodingType.Base64 
    });
    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabase.storage
      .from('evidencias')
      .upload(job.storagePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Supabase Storage Error: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('evidencias')
      .getPublicUrl(job.storagePath);

    const { error: dbError } = await supabase
      .from('envios')
      .update({
        pod_url: publicUrl,
        url_foto: publicUrl,
        estado: 'entregado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.pedidoId);

    if (dbError) throw dbError;

    await FileSystem.deleteAsync(job.localUri, { idempotent: true });

    // Notify Sheets
    try {
      await EnviosService.notificarSheets(job.pedidoId);
    } catch (e) {
      console.error('[Queue] Error sending Google Sheets notification:', e);
    }

    return true;
  },

  ESTADO_ENVIO: async (payload: EstadoEnvioJob): Promise<boolean> => {
    const { supabaseRowId, nuevoEstado, podLocalUri, codPedido } = payload;
    let podUrl: string | undefined;
    
    // Si hay foto, subirla primero
    if (podLocalUri) {
      // Usamos import dinámico como sugiere el usuario
      const { EnviosService } = await import('../../../features/logistics/services/enviosService');
      const uploadedUrl = await EnviosService.subirFotoPOD(podLocalUri, codPedido);
      podUrl = uploadedUrl ?? undefined;
    }
    
    // Actualizar estado en Supabase
    const { EnviosService } = await import('../../../features/logistics/services/enviosService');
    const result = await EnviosService.actualizarEstado({
      supabaseRowId,
      nuevoEstado,
      podUrl,
    });
    
    if (!result.exito) {
      throw new Error(`Supabase update failed: ${result.error}`);
    }
    
    // Notificar Sheets (sin bloquear si falla)
    EnviosService.notificarSheets(supabaseRowId).catch(() => {});
    return true;
  }

};

