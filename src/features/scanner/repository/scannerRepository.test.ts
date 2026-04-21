import { ScannerRepository } from './scannerRepository';
import { InventarioRepository } from '../../inventory/repository/inventarioRepository';
import { benchmark } from '../../../core/utils/benchmark';

jest.mock('../../inventory/repository/inventarioRepository');

describe('ScannerRepository - Unit & Performance', () => {
    test('buscarProducto delega correctamente a InventarioRepository', async () => {
        const mockProducto = { codBarras: '123' };
        (InventarioRepository.buscarPorCodigoBarras as jest.Mock).mockResolvedValue(mockProducto);

        const { result, metrics } = await benchmark('Scanner Search', async () => {
            return await ScannerRepository.buscarProducto('123');
        });

        expect(InventarioRepository.buscarPorCodigoBarras).toHaveBeenCalledWith('123');
        expect(result).toEqual(mockProducto);
        expect(metrics.durationMs).toBeLessThan(50);
    });
});
