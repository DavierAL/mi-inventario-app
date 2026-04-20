// supabase/functions/_shared/types.ts
// Tipos compartidos entre todas las Edge Functions

// ─── WooCommerce API Types ────────────────────────────────────────────────────

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  sku: string;
  price: number;
  total: string;
  subtotal: string;
  meta_data: WooMeta[];
  image?: { id: number; src: string };
}

export interface WooMeta {
  id: number;
  key: string;
  value: unknown;
}

export interface WooBilling {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

export interface WooOrder {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  status: string;                    // processing | procesando-yape | completed | cancelled | pending | on-hold
  currency: string;
  date_created: string;              // ISO 8601
  date_modified: string;
  date_paid: string | null;
  date_completed: string | null;
  total: string;
  subtotal: string;
  shipping_total: string;
  billing: WooBilling;
  shipping: Omit<WooBilling, 'email' | 'phone'>;
  payment_method: string;            // cod | yape | plin | culqi etc
  payment_method_title: string;      // "Contra entrega TARJETA - YAPE - PLIN"
  transaction_id: string;
  customer_note: string;
  meta_data: WooMeta[];
  line_items: WooLineItem[];
  tax_lines: unknown[];
  shipping_lines: unknown[];
  coupon_lines: unknown[];
  refunds: unknown[];
}

// ─── Mascotify DB Types (mirror de las tablas Supabase) ──────────────────────

export type EstadoPedido =
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

export interface PedidoInsert {
  woo_order_id: number;
  woo_order_key: string;
  woo_status: string;
  woo_created_at: string;
  canal: string;
  cliente_nombre: string;
  cliente_apellido?: string;
  cliente_email?: string;
  cliente_telefono?: string;
  direccion?: string;
  distrito?: string;
  referencia?: string;
  gmaps_url?: string;
  tipo_documento?: string;
  numero_documento?: string;
  metodo_pago_raw?: string;
  metodo_pago_display?: string;
  total_woo?: number;
  fecha_entrega?: string;
  bultos: number;
  tamanio?: string;
  operador_logistico: OperadorLogistico;
  estado: EstadoPedido;
  notas?: string;
}

export interface PedidoItemInsert {
  pedido_id: string;
  producto_id?: string;
  descripcion_woo: string;
  sku_woo?: string;
  woo_line_item_id?: number;
  cantidad_pedida: number;
  precio_unitario_woo: number;
}

// ─── Edge Function Response Types ────────────────────────────────────────────

export interface EdgeFunctionResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

// ─── Webhook Payload (WooCommerce envía el objeto order directamente) ────────

export type WebhookPayload = WooOrder;
