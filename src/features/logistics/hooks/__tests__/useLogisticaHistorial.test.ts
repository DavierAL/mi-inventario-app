import { renderHook, waitFor } from '@testing-library/react-native';
import { useLogisticaHistorial } from '../useLogisticaHistorial';
import { database } from '../../../../core/database';
import { useAuthStore } from '../../../../core/store/useAuthStore';
import { Q } from '@nozbe/watermelondb';

// Mock dependencias
jest.mock('../../../../core/database', () => ({
  database: {
    get: jest.fn(),
  },
}));

jest.mock('../../../../core/store/useAuthStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

describe('useLogisticaHistorial', () => {
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMockDatabase = (mockData: any[], throwError = false) => {
    const mockSubscribe = jest.fn(({ next, error }) => {
      if (throwError) {
        error(new Error('DB Error'));
      } else {
        next(mockData);
      }
      return { unsubscribe: mockUnsubscribe };
    });
    
    const mockQuery = jest.fn().mockReturnValue({
      observe: jest.fn().mockReturnValue({
        subscribe: mockSubscribe,
      }),
    });

    (database.get as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    return mockQuery;
  };

  it('debe suscribirse a la coleccion logistica_historial y retornar datos', async () => {
    const mockData = [{ id: '1', operador: 'Salva' }];
    const mockQuery = setupMockDatabase(mockData);

    (useAuthStore.getState as jest.Mock).mockReturnValue({
      user: { rol: 'admin' }, // Rol no filtra por operador
    });

    const { result, unmount } = renderHook(() => useLogisticaHistorial());

    // Estado inicial de cargando es modificado casi inmediatamente por el mock sincrono
    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.entradas).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(database.get).toHaveBeenCalledWith('logistica_historial');
    // Sólo debería llamar con sortBy porque rol admin no agrega where
    expect(mockQuery).toHaveBeenCalled();
    
    // Validar cleanup
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('debe aplicar filtro para rol logistica', async () => {
    const mockQuery = setupMockDatabase([]);
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      user: { rol: 'logistica' },
    });

    renderHook(() => useLogisticaHistorial());

    expect(mockQuery).toHaveBeenCalledWith(
      Q.where('operador', 'Salva'),
      Q.sortBy('timestamp', Q.desc)
    );
  });

  it('debe aplicar filtro para rol tienda', async () => {
    const mockQuery = setupMockDatabase([]);
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      user: { rol: 'tienda' },
    });

    renderHook(() => useLogisticaHistorial());

    expect(mockQuery).toHaveBeenCalledWith(
      Q.where('operador', Q.oneOf(['Tienda', 'Yango', 'Cabify'])),
      Q.sortBy('timestamp', Q.desc)
    );
  });

  it('debe manejar errores de base de datos', async () => {
    setupMockDatabase([], true);
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      user: { rol: 'admin' },
    });

    // Supress console.error in test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLogisticaHistorial());

    await waitFor(() => {
      expect(result.current.cargando).toBe(false);
    });

    expect(result.current.error).toBe('No se pudo cargar el historial');
    expect(result.current.entradas).toEqual([]);

    consoleSpy.mockRestore();
  });
});
