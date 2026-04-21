import { synchronize } from '@nozbe/watermelondb/sync';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../core/database';
import Pedido, { EstadoPedido } from '../../../core/database/models/Pedido';

const PROXY_URL = process.env.EXPO_PUBLIC_CLOUD_FUNCTION_URL || '';

/**
 * Mapea los estados de Google Sheets a los estados internos de la App.
 */
function mapearEstadoEntrante(estadoOriginal: string): EstadoPedido {
  const norm = (estadoOriginal || '').toLowerCase().trim();
  
  if (norm.includes('impresion etiqueta') || norm === 'pendiente') return 'Pendiente';
  if (norm.includes('listo para envio') || norm === 'en tienda' || norm === 'en_tienda') return 'En_Tienda';
  if (norm.includes('entregado')) return 'Entregado';
  
  return 'Pendiente';
}

/**
 * Sincronización Local-First contra Google Sheets (vía Proxy).
 * La integración nativa de Supabase queda pausada por ahora.
 */
export async function syncConSupabase(options: { forceFull?: boolean } = {}) {
  
  await synchronize({
    database,
    // 1. PULL: Descargar cambios desde Google Sheets
    pullChanges: async ({ lastPulledAt }: { lastPulledAt?: number }) => {
      console.log(`[Sync] PULL desde Google Sheets Proxy. LastPulled: ${lastPulledAt}`);

      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accion: 'leer_todo', // Acción esperada por el Google Apps Script
          lastPulledAt: lastPulledAt || 0 
        })
      });

      if (!response.ok) {
        throw new Error(`Error en Proxy Sheets: ${response.statusText}`);
      }

      const { data } = await response.json();
      
      if (!data) {
        console.warn('[Sync] No se recibieron datos del Proxy');
        return { changes: {}, timestamp: Date.now() };
      }

      // Mapeo de Productos
      const productosUpdated = (data.productos || []).map((row: any) => ({
        id: row.id || row.cod_barras,
        cod_barras: row.cod_barras,
        sku: row.sku,
        descripcion: row.descripcion,
        stock_master: row.stock_master ?? row.stock ?? 0,
        precio_web: row.precio_web ?? 0,
        precio_tienda: row.precio_tienda ?? 0,
        fv_actual_ts: row.fv_actual_ts,
        fecha_edicion: row.fecha_edicion,
        comentarios: row.comentarios,
        marca: row.marca,
        imagen: row.imagen,
        created_at: row.created_at || Date.now(),
        updated_at: row.updated_at || Date.now()
      }));

      // Mapeo de Pedidos
      const pedidosUpdated = (data.pedidos || []).map((row: any) => ({
        id: row.id || row.cod_pedido,
        cod_pedido: row.cod_pedido,
        cliente: row.cliente ?? '',
        estado: mapearEstadoEntrante(row.estado),
        operador: row.operador ?? null,
        pod_local_uri: null,
        url_foto: row.url_foto ?? null,
        notas: row.notas ?? null,
        created_at: row.created_at || Date.now(),
        updated_at: row.updated_at || Date.now(),
      }));

      return {
        changes: {
          productos: { created: [], updated: productosUpdated, deleted: [] },
          movimientos: { created: [], updated: [], deleted: [] },
          pedidos: { created: [], updated: pedidosUpdated, deleted: [] },
        },
        timestamp: Date.now(),
      };
    },

    // 2. PUSH: Enviar cambios locales a Google Sheets
    pushChanges: async ({ changes }: { changes: any }) => {
      // Sincronizar Cambios de Inventario
      if (changes.productos) {
        const allProdChanges = [...changes.productos.created, ...changes.productos.updated];
        for (const record of allProdChanges) {
          await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accion: 'webhook_modificacion',
              datos: {
                codigoBarras: record.cod_barras,
                nuevoStock: record.stock_master,
                nuevoComentario: record.comentarios,
                // ...otros campos si son necesarios
              }
            })
          });
        }
      }

      // Sincronizar Cambios de Pedidos (Entregas, etc)
      if (changes.pedidos) {
        const allPedidoChanges = [...changes.pedidos.created, ...changes.pedidos.updated];
        for (const record of allPedidoChanges) {
          // Si el pedido se marcó como entregado, notificamos
          if (record.estado === 'Entregado') {
            await fetch(PROXY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accion: 'logistica_entrega',
                datos: {
                  codigo_pedido: record.cod_pedido,
                  url_foto: record.url_foto,
                  timestamp: Date.now()
                }
              })
            });
          }
        }
      }
    },
  });
}
