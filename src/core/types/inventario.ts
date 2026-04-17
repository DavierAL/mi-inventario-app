// ARCHIVO: src/core/types/inventario.ts

export interface ProductoInventario {
    Cod_Barras: string;
    SKU: string;
    Descripcion: string;
    Stock_Master: number;
    Precio_Web: number;
    Precio_Tienda: number;
    FV_Actual_TS?: number;
    FV_Actual?: string; // Para compatibilidad con Webhooks legacy
    Fecha_edicion: string;
    Imagen: string;
    Comentarios: string;
    Marca: string; // Marcado como obligatorio para evitar validaciones nulas constantes
}

export type TipoAccionHistorial = 'FV_ACTUALIZADO' | 'COMENTARIO_AGREGADO' | 'EDICION_COMPLETA';

export interface EntradaHistorial {
    id?: string;
    productoId: string;      // Cod_Barras
    descripcion: string;     // Nombre del producto
    marca: string;
    sku: string;
    accion: TipoAccionHistorial;
    cambios: {
        fvAnteriorTs?: number;
        fvNuevoTs?: number;
        comentario?: string;
    };
    timestamp: number;       // Unix ms para ordenar y formatear
    dispositivo: string;     // Modelo del dispositivo
}
