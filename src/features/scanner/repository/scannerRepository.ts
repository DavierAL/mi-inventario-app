import { InventarioRepository } from '../../inventory/repository/inventarioRepository';
import Producto from '../../../core/database/models/Producto';

/**
 * ScannerRepository
 * 
 * Centraliza la lógica de datos específica para el escaneo de productos.
 * Actualmente delega en InventarioRepository para mantener la consistencia.
 */
export const ScannerRepository = {
    /**
     * Busca un producto por su código de barras.
     */
    async buscarProducto(codigoBarras: string): Promise<Producto | null> {
        return InventarioRepository.buscarPorCodigoBarras(codigoBarras);
    }
};
