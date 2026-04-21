import { renderHook, act } from '@testing-library/react-native';
import { useScanner } from '../useScanner';
import { useInventarioStore } from '../../../inventory/store/useInventarioStore';
import { ScannerRepository } from '../../repository/scannerRepository';
import { benchmark } from '../../../../core/utils/benchmark';

jest.mock('../../../inventory/store/useInventarioStore');
jest.mock('../../repository/scannerRepository');

describe('useScanner Hook - Unit & Performance', () => {
    const mockSetProductoEditando = jest.fn();
    
    beforeEach(() => {
        jest.clearAllMocks();
        (useInventarioStore as unknown as jest.Mock).mockReturnValue({
            setProductoEditando: mockSetProductoEditando,
            productoEditando: null,
            guardarEdicion: jest.fn(),
        });
    });

    test('manejarCodigoEscaneado con producto encontrado', async () => {
        const mockProducto = { id: 'p1', codBarras: '123' };
        (ScannerRepository.buscarProducto as jest.Mock).mockResolvedValue(mockProducto);

        const hook = renderHook(() => useScanner());

        const { metrics } = await benchmark('Handle Scanned Code (Found)', async () => {
            await act(async () => {
                await hook.result.current.manejarCodigoEscaneado({ data: '123' });
            });
        });

        expect(ScannerRepository.buscarProducto).toHaveBeenCalledWith('123');
        expect(mockSetProductoEditando).toHaveBeenCalledWith(mockProducto);
        expect(metrics.durationMs).toBeLessThan(100);
    });

    test('manejarCodigoEscaneado con producto NO encontrado', async () => {
        (ScannerRepository.buscarProducto as jest.Mock).mockResolvedValue(null);

        const hook = renderHook(() => useScanner());

        const { metrics } = await benchmark('Handle Scanned Code (Not Found)', async () => {
            await act(async () => {
                await hook.result.current.manejarCodigoEscaneado({ data: 'unknown' });
            });
        });

        expect(ScannerRepository.buscarProducto).toHaveBeenCalledWith('unknown');
        expect(mockSetProductoEditando).not.toHaveBeenCalled();
        expect(metrics.durationMs).toBeLessThan(100);
    });
});
