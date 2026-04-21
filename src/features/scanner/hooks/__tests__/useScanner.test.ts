import { renderHook, act } from '@testing-library/react-native';
import { useScanner } from '../useScanner';
import { ScannerRepository } from '../../repository/scannerRepository';

// Mock ScannerRepository
jest.mock('../../repository/scannerRepository', () => ({
    ScannerRepository: {
        buscarProducto: jest.fn(),
    }
}));

describe('useScanner Hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('maneja el escaneo de un codigo de barras', async () => {
        (ScannerRepository.buscarProducto as jest.Mock).mockResolvedValue({ id: '1', nombre: 'Test' });
        const { result } = renderHook(() => useScanner());
        
        await act(async () => {
            await result.current.manejarCodigoEscaneado({ data: '12345' });
        });
        
        expect(ScannerRepository.buscarProducto).toHaveBeenCalledWith('12345');
    });

    it('previene escaneos duplicados rapidos', async () => {
        (ScannerRepository.buscarProducto as jest.Mock).mockResolvedValue({ id: '1', nombre: 'Test' });
        const { result } = renderHook(() => useScanner());
        
        await act(async () => {
            // No usamos await aquí para simular llamadas rápidas
            result.current.manejarCodigoEscaneado({ data: '12345' });
            result.current.manejarCodigoEscaneado({ data: '12345' });
        });
        
        expect(ScannerRepository.buscarProducto).toHaveBeenCalledTimes(1);
    });
});
