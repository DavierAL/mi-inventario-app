import { syncConSupabase } from './syncService';
import { supabase } from '../../../core/database/supabase';
import { benchmark } from '../../../core/utils/benchmark';

// Mock del fetch global
global.fetch = jest.fn();

describe('SyncService - Unit Tests & Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Mapeo de envios desde Supabase (Performance)', async () => {
    const mockEnvio = {
      id: 'uuid-123',
      cod_pedido: 'PED-123',
      cliente: 'Juan Perez',
      estado: 'Entregado',
      telefono: '999888777',
      distrito: 'Miraflores',
      created_at: '2026-04-20T00:00:00Z',
      updated_at: '2026-04-20T01:00:00Z',
    };

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      gt: jest.fn().mockResolvedValue({ data: [mockEnvio], error: null }),
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: { productos: [] } }),
    });

    // Medimos el performance del pull completo de envios
    const { metrics } = await benchmark('Sync Pull Mapping Envios', async () => {
      await syncConSupabase({ forceFull: true });
    });

    expect(metrics.durationMs).toBeLessThan(300); 
  });

  test('Manejo de estados normalizados en sync', async () => {
      const mockEnvio = {
        id: 'uuid-456',
        cod_pedido: 'PED-456',
        estado: 'pendiente', // En minúsculas, debe ser manejado por el modelo
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValue({ data: [mockEnvio], error: null }),
      });

      await syncConSupabase();
  });

  test('Manejo de errores de Supabase', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: null, error: { message: 'API Error' } }),
      });

      // No debería lanzar excepción, sino manejar el error internamente (Logger)
      await expect(syncConSupabase()).resolves.not.toThrow();
  });

  test('Mapeo de roles en minúscula durante el pull', async () => {
    // Simular respuesta con roles variados para verificar que se acepten/normalicen si fuera necesario
    // Aunque el modelo los recibe tal cual, aquí verificamos que la integración no falle
    const mockUser = { id: 'u1', rol: 'admin', nombre: 'Admin' };
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [mockUser], error: null }),
    });

    await expect(syncConSupabase()).resolves.not.toThrow();
  });
});
