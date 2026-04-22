// supabase/functions/_shared/types.ts
// Tipos compartidos entre todas las Edge Functions

// ─── Mascotify DB Types (mirror de las tablas Supabase) ──────────────────────

export type EstadoEnvio =
  | 'pendiente'
  | 'en_proceso'
  | 'con_faltante'
  | 'revisar_pago'
  | 'impresion_etiqueta'
  | 'listo_envio'
  | 'en_ruta'
  | 'entregado'
  | 'reprogramado'
  | 'devolucion_pendiente'
  | 'anulado';

export type OperadorLogistico = 'salva' | 'urbano_olva' | 'otro';

export interface EnvioInsert {
  cod_pedido: string;
  cliente_nombre: string;
  cliente_apellido?: string;
  cliente_email?: string;
  cliente_telefono?: string;
  direccion?: string;
  distrito?: string;
  referencia?: string;
  gmaps_url?: string;
  metodo_pago_display?: string;
  fecha_entrega?: string;
  bultos: number;
  tamanio?: string;
  operador_logistico: OperadorLogistico;
  estado: EstadoEnvio;
  notas?: string;
}

// ─── Edge Function Response Types ────────────────────────────────────────────

export interface EdgeFunctionResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

