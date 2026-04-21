import { renderHook } from '@testing-library/react-native';
import { useHistorial } from './useHistorial';
import { benchmark } from '../../../core/utils/benchmark';

describe('useHistorial Hook - Mapping Logic', () => {
    test('Mapea correctamente movimientos de DB a EntradaHistorial', async () => {
        const mockMovimientos = [
            {
                id: 'm1',
                productoId: '123',
                descripcion: 'Test',
                marca: 'M',
                sku: 'S',
                accion: 'FV_ACTUALIZADO',
                fvAnteriorTs: new Date('2023-01-01'),
                fvNuevoTs: new Date('2024-01-01'),
                comentario: 'Test C',
                timestamp: 1600000000000,
                dispositivo: 'Android'
            }
        ];

        const { result: hookResult, metrics } = await benchmark('Historial Mapping', async () => {
            return renderHook(() => useHistorial(mockMovimientos as any));
        });

        const entry = hookResult.result.current.entradas[0];
        expect(entry.id).toBe('m1');
        expect(entry.cambios.fvAnterior).toBe('01/01/2023');
        expect(metrics.durationMs).toBeLessThan(50);
    });
});
