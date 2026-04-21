import { useInventarioStore } from './useInventarioStore';
import { syncConSupabase } from '../services/syncService';
import { benchmark } from '../../../core/utils/benchmark';

// Mock del syncService
jest.mock('../services/syncService', () => ({
  syncConSupabase: jest.fn().mockResolvedValue(undefined),
}));

// Mock del repositorio
jest.mock('../repository/inventarioRepository', () => ({
  InventarioRepository: {
    actualizarProducto: jest.fn().mockResolvedValue({}),
  },
}));

describe('useInventarioStore - State & Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('conectarInventario actualiza el estado y llama a sync (Carga)', async () => {
    const store = useInventarioStore.getState();

    const { metrics } = await benchmark('Store Connection Load', async () => {
        await useInventarioStore.getState().conectarInventario();
    });

    // Verificamos que se llamó a sync
    expect(syncConSupabase).toHaveBeenCalled();
    expect(metrics.durationMs).toBeLessThan(50);
  });

  test('repararBaseDeDatos activa modo sincronizando (Performance)', async () => {
    const { metrics } = await benchmark('Store Repair Database', async () => {
        await useInventarioStore.getState().repararBaseDeDatos();
    });

    expect(syncConSupabase).toHaveBeenCalledWith({ forceFull: true });
    expect(metrics.durationMs).toBeLessThan(100);
  });

  test('Manejo de errores en conectarInventario', async () => {
      (syncConSupabase as jest.Mock).mockRejectedValueOnce(new Error('Network Fail'));
      
      await useInventarioStore.getState().conectarInventario();
      
      expect(useInventarioStore.getState().error).toContain('Error de conexión');
  });
});
