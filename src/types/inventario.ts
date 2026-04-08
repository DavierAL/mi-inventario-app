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
    Fila_Inventario: number;
    Imagen: string;
    Comentarios: string;
    Marca?: string;
}

// Esta interfaz define la respuesta que nos da Google Apps Script
export interface RespuestaAPI {
    status: 'success' | 'error';
    message?: string;
    data?: ProductoInventario[];
    // Metadatos de caché offline
    fromCache?: boolean;
    lastSync?: string; // Texto legible: "hace 2 horas"
}