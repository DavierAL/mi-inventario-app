import { renderHook } from '@testing-library/react-native';
import { useAnalytics } from '../useAnalytics';

describe('useAnalytics Hook', () => {
    it('calcula estadisticas correctamente para productos vencidos', () => {
        const mockProductos = [
            { 
                fvActualTs: Date.now() - 86400000, // Ayer
                stockMaster: 10,
                precioTienda: 5,
                descripcion: 'Test Vencido',
                marca: 'Marca A'
            },
            {
                fvActualTs: Date.now() + 86400000 * 60, // En 60 días
                stockMaster: 20,
                precioTienda: 10,
                descripcion: 'Test Sano',
                marca: 'Marca B'
            }
        ];

        const { result } = renderHook(() => useAnalytics(mockProductos as any));
        
        expect(result.current.capitalPerdido).toBe(50); // 10 * 5
        expect(result.current.totalInventario).toBe(30);
        expect(result.current.recomendaciones.length).toBeGreaterThan(0);
    });

    it('calcula salud del inventario correctamente', () => {
        const mockProductos = [
            { fvActualTs: Date.now() + 86400000 * 60, stockMaster: 10 },
            { fvActualTs: Date.now() - 86400000, stockMaster: 10 }
        ];
        const { result } = renderHook(() => useAnalytics(mockProductos as any));
        expect(result.current.saludPorcentaje).toBe(50);
    });
});
