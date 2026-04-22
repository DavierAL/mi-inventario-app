import { renderHook, waitFor } from '@testing-library/react-native';
import { useHistorial } from './useHistorial';
import { benchmark } from '../../../core/utils/benchmark';
import { database } from '../../../core/database';
import { of } from 'rxjs';

// Mock de la base de datos para este test específico
jest.mock('../../../core/database', () => ({
    database: {
        collections: {
            get: jest.fn().mockReturnThis(),
        },
        query: jest.fn().mockReturnThis(),
        observe: jest.fn(),
    }
}));

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
                fvAnteriorTs: new Date(2023, 0, 1),
                fvNuevoTs: new Date(2024, 0, 1),
                comentario: 'Test C',
                timestamp: 1600000000000,
                dispositivo: 'Android'
            }
        ];

        // Configuramos el mock para devolver el observable con los movimientos
        const { get } = database.collections as any;
        get.mockReturnValue({
            query: jest.fn().mockReturnThis(),
            observe: jest.fn().mockReturnValue(of(mockMovimientos))
        });

        const { result: hookResult, metrics } = await benchmark('Historial Mapping', async () => {
            const render = renderHook(() => useHistorial());
            // Esperamos a que el hook cargue los datos
            await waitFor(() => expect(render.result.current.cargando).toBe(false));
            return render;
        });

        const entry = hookResult.result.current.entradas[0];
        expect(entry).toBeDefined();
        expect(entry.id).toBe('m1');
        expect(entry.cambios.fvAnterior).toBe('01/01/2023');
        expect(metrics.durationMs).toBeLessThan(100);
    });
});
