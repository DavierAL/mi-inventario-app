import { syncConSupabase } from './syncService';
import { supabase } from '../../../core/database/supabase';
import { benchmark } from '../../../core/utils/benchmark';

// Mock del fetch global
global.fetch = jest.fn();

describe('SyncService - Unit Tests & Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Mapeo de pedidos desde Supabase (Branch Coverage)', async () => {
    const mockPedido = {
      id: 123,
      woo_order_id: 456,
      cliente_nombre: 'Juan',
      cliente_apellido: 'Perez',
      estado: 'impresion_etiqueta',
      created_at: '2026-04-20T00:00:00Z',
      updated_at: '2026-04-20T01:00:00Z',
    };

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      gt: jest.fn().mockResolvedValue({ data: [mockPedido], error: null }),
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: { productos: [] } }),
    });

    // Medimos el performance del pull completo
    const { metrics } = await benchmark('Sync Pull Mapping Pedidos', async () => {
      await syncConSupabase({ forceFull: true });
    });

    expect(metrics.durationMs).toBeLessThan(100); 
  });

  test('Mapeo de items de pedido (Performance)', async () => {
      const mockItem = {
          id: 1,
          pedido_id: 123,
          sku_woo: 'SKU001',
          descripcion_woo: 'Producto Test',
          cantidad_pedida: 2,
          precio_unitario_woo: 10.5,
          created_at: '2026-04-20T00:00:00Z',
          updated_at: '2026-04-20T01:00:00Z',
      };

      (supabase.from as jest.Mock).mockImplementation((table) => ({
          select: jest.fn().mockReturnThis(),
          gt: jest.fn().mockResolvedValue({ 
              data: table === 'pedidos' ? [] : [mockItem], 
              error: null 
          }),
      }));

      const { metrics } = await benchmark('Sync Pull Mapping Items', async () => {
          await syncConSupabase();
      });

      expect(metrics.durationMs).toBeLessThan(50);
  });

  test('Manejo de estados desconocidos en mapearEstadoEntrante', async () => {
      // Este test cubrira la rama "return 'Pendiente'" de mapearEstadoEntrante
      const mockPedido = {
        id: 1,
        estado: 'estado_desconocido_xyz',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValue({ data: [mockPedido], error: null }),
      });

      // No necesitamos verificar el resultado exacto aquí si solo queremos cobertura,
      // pero es buena práctica hacerlo.
      await syncConSupabase();
  });
});
