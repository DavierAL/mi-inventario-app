// supabase/functions/_shared/helpers.ts
// Funciones compartidas entre Edge Functions

import type { WooOrder, WooMeta, EstadoPedido, OperadorLogistico } from './types.ts';

// ─── Validación HMAC del webhook de WooCommerce ──────────────────────────────

/**
 * Valida la firma HMAC-SHA256 que WooCommerce incluye en cada webhook.
 * WooCommerce genera: base64(HMAC-SHA256(rawBody, webhookSecret))
 * 
 * IMPORTANTE: Usar el rawBody (string) ANTES de parsear el JSON.
 */
export async function validarFirmaWebhook(
  rawBody: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(rawBody);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const signatureArray = new Uint8Array(signatureBuffer);

    // Convertir a base64
    const expectedSignature = btoa(String.fromCharCode(...signatureArray));

    // Comparación en tiempo constante para prevenir timing attacks
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

// ─── Lógica de negocio: determinar estado del pedido según método de pago ────

/**
 * Replica exactamente la lógica del Google Apps Script original (doPost).
 * Determina el estado inicial del pedido y el método de pago normalizado.
 */
export function determinarEstadoYPago(order: WooOrder): {
  estado: EstadoPedido;
  metodo_pago_display: string;
  total_woo: number | null;
} {
  const metodoPagoRaw = order.payment_method_title || '';
  const estadoWoo = order.status || '';

  // ─── Contra entrega / Efectivo → Impresión de etiqueta inmediata ─────────
  if (metodoPagoRaw.includes('Contra entrega TARJETA - YAPE - PLIN')) {
    return {
      estado: 'impresion_etiqueta',
      metodo_pago_display: 'POS YAPE PLIN',
      total_woo: parseFloat(order.total),
    };
  }

  if (metodoPagoRaw.includes('EFECTIVO')) {
    return {
      estado: 'impresion_etiqueta',
      metodo_pago_display: 'EFECTIVO',
      total_woo: parseFloat(order.total),
    };
  }

  // ─── Tarjeta en línea → depende del estado en WooCommerce ────────────────
  if (metodoPagoRaw.includes('TARJETA (en línea)')) {
    // Si el pago ya fue procesado (Culqi confirmó el cargo)
    if (!estadoWoo.includes('pending')) {
      const culqiMeta = order.meta_data.find((m: WooMeta) => m.key === 'culqi_log');
      const culqiLog = culqiMeta ? JSON.stringify(culqiMeta.value) : '';
      if (culqiLog.includes('Culqi Cargo Creado')) {
        return {
          estado: 'impresion_etiqueta',
          metodo_pago_display: 'TARJETA_ONLINE',
          total_woo: null, // Se muestra cuando el pago se confirma
        };
      }
    }
    // Pago pendiente de confirmación
    return {
      estado: 'revisar_pago',
      metodo_pago_display: 'TARJETA_ONLINE',
      total_woo: null,
    };
  }

  // ─── YAPE en línea ────────────────────────────────────────────────────────
  if (metodoPagoRaw.includes('YAPE (en línea)')) {
    return {
      estado: 'revisar_pago',
      metodo_pago_display: 'YAPE_ONLINE',
      total_woo: null,
    };
  }

  // ─── Plin en línea ────────────────────────────────────────────────────────
  if (metodoPagoRaw.includes('Plin (en línea)')) {
    return {
      estado: 'revisar_pago',
      metodo_pago_display: 'PLIN_ONLINE',
      total_woo: null,
    };
  }

  // ─── Cualquier otro método → revisar pago ────────────────────────────────
  return {
    estado: 'revisar_pago',
    metodo_pago_display: 'OTRO',
    total_woo: null,
  };
}

// ─── Extraer metadatos de WooCommerce ─────────────────────────────────────────

export function getMetaValue(metaData: WooMeta[], key: string): string {
  const meta = metaData.find((m) => m.key === key);
  if (!meta?.value) return '';
  return String(meta.value);
}

/**
 * Extrae la URL de Google Maps de la referencia si la incluye.
 */
export function extraerGmapsUrl(referencia: string): string {
  if (!referencia) return '';
  const match = referencia.match(/(https?:\/\/[^\s]+)/i);
  return match ? match[0] : '';
}

/**
 * Formatea la fecha de entrega del formato WooCommerce (DD-MM-YY) a ISO (YYYY-MM-DD)
 * El campo _additional_wooccm0 viene como "19-04-26" (DD-MM-YY)
 */
export function parsearFechaEntrega(valor: string): string | null {
  if (!valor || typeof valor !== 'string') return null;

  // Formato DD-MM-YY
  const match = valor.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, dia, mes, anio] = match;
    return `20${anio}-${mes}-${dia}`;
  }

  // Formato DD/MM/YY
  const match2 = valor.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (match2) {
    const [, dia, mes, anio] = match2;
    return `20${anio}-${mes}-${dia}`;
  }

  return null;
}

// ─── Determinar operador logístico ────────────────────────────────────────────

/**
 * Por defecto Salva para Lima Metropolitana.
 * Urbano/Olva si la dirección indica provincia (distrito no reconocido de Lima).
 * 
 * En el futuro esto podría ser una tabla de configuración en Supabase.
 */
export function determinarOperadorLogistico(
  distrito: string,
  referencia: string
): OperadorLogistico {
  const distritoLower = (distrito || '').toLowerCase();
  const referenciaLower = (referencia || '').toLowerCase();

  // Indicadores de envío a provincia
  if (
    referenciaLower.includes('envio urbano') ||
    referenciaLower.includes('envío urbano') ||
    referenciaLower.includes('urbano express') ||
    referenciaLower.includes('olva')
  ) {
    return 'urbano_olva';
  }

  // Lista de distritos de Lima Metropolitana conocidos
  const distritosLima = [
    'ate', 'barranco', 'breña', 'callao', 'carabayllo', 'carmen de la legua',
    'cercado de lima', 'chorrillos', 'comas', 'el agustino', 'independencia',
    'jesús maría', 'la molina', 'la perla', 'la victoria', 'lince',
    'los olivos', 'lurigancho', 'lurin', 'magdalena del mar', 'miraflores',
    'puente piedra', 'pueblo libre', 'rimac', 'rímac', 'san borja', 'san isidro',
    'san juan de lurigancho', 'san juan de miraflores', 'san luis', 'san martín de porres',
    'san miguel', 'santa anita', 'santiago de surco', 'surco', 'surquillo',
    'villa el salvador', 'villa maria del triunfo', 'villa maría del triunfo',
    'ventanilla', 'cieneguilla', 'pachacamac', 'santa rosa', 'punta hermosa',
    'punta negra', 'san bartolo', 'santa maria del mar',
  ];

  if (distritosLima.some((d) => distritoLower.includes(d))) {
    return 'salva';
  }

  // Si no reconocemos el distrito, asumimos provincia
  return 'urbano_olva';
}

// ─── CORS headers para las Edge Functions ────────────────────────────────────

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function corsResponse(status = 200): Response {
  return new Response('ok', { headers: CORS_HEADERS, status });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    status,
  });
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ success: false, error: message }, status);
}
