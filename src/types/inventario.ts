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