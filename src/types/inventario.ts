// ARCHIVO: src/types/inventario.ts

export interface ProductoInventario {
    Cod_Barras: string;
    SKU: string;
    Descripcion: string;
    Stock_Master: number;
    Precio_Web: number;
    Precio_Tienda: number;
    FV_Actual: string;
    Fecha_edicion: string;
    Imagen: string;
    Comentarios: string;
    Marca: string; // Marcado como obligatorio para evitar validaciones nulas constantes
}

export type TipoAccionHistorial = 'FV_ACTUALIZADO' | 'COMENTARIO_AGREGADO' | 'RAFAGA_PROCESADA' | 'EDICION_COMPLETA';

export interface EntradaHistorial {
    id?: string;
    productoId: string;      // Cod_Barras
    descripcion: string;     // Nombre del producto
    marca: string;
    sku: string;
    accion: TipoAccionHistorial;
    cambios: {
        fvAnterior?: string;
        fvNuevo?: string;
        comentario?: string;
    };
    timestamp: number;       // Unix ms para ordenar y formatear
    dispositivo: string;     // Modelo del dispositivo
}