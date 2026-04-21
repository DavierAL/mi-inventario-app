// src/core/services/queue/jobHandlers.ts
import { supabase } from '../../database/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { WebhookPayload, FotoUploadJob } from './types';

const getApiUrl = () => process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL || '';

export const jobHandlers = {
  webhook: async (payload: WebhookPayload): Promise<boolean> => {
    const res = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      .from('pedidos')
      .upload(job.storagePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Supabase Storage Error: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('pedidos')
      .getPublicUrl(job.storagePath);

    const { error: dbError } = await supabase
      .from('envios')
      .update({
        url_foto: publicUrl,
        estado: 'entregado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.pedidoId);

    if (dbError) throw dbError;

    await FileSystem.deleteAsync(job.localUri, { idempotent: true });

    // Notify Sheets (Fire and forget as per original logic)
    fetch(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'logistica_entrega',
        codigo_pedido: job.codPedido,
        url_foto: publicUrl,
        timestamp: Date.now(),
      }),
    }).catch(() => {});

    return true;
  }
};
