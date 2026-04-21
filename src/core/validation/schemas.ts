// src/core/validation/schemas.ts
import { z } from 'zod';

/**
 * Validates descriptive dates in DD/MM/YYYY format
 */
const DateStringSchema = z.string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato debe ser DD/MM/AAAA')
  .refine((val) => {
    const [day, month, year] = val.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, 'Fecha inválida');

/**
 * Producto Schema
 */
export const ProductoSchema = z.object({
  cod_barras: z.string().min(1, 'Código de barras requerido'),
  sku: z.string().min(1, 'SKU requerido'),
  descripcion: z.string().min(1, 'Descripción requerida'),
  stock_master: z.number().min(0, 'El stock no puede ser negativo'),
  marca: z.string().min(1, 'Marca requerida'),
  fv_actual: DateStringSchema.optional().or(z.literal('')),
  comentarios: z.string().optional(),
  imagen: z.string().url().optional().or(z.literal('')),
});

export const EditProductoSchema = z.object({
  fv_actual: DateStringSchema.optional().or(z.literal('')),
  comentarios: z.string().max(500, 'El comentario es muy largo').optional(),
});

export type ProductoInput = z.infer<typeof ProductoSchema>;
export type EditProductoInput = z.infer<typeof EditProductoSchema>;

/**
 * Envio (Pedido) Schema
 */
export const EnvioSchema = z.object({
  cod_pedido: z.string().min(1, 'Código de pedido requerido'),
  cliente: z.string().min(1, 'Cliente requerido'),
  estado: z.enum(['Pendiente', 'En_Tienda', 'Entregado', 'Cancelado']),
  direccion: z.string().optional(),
  distrito: z.string().optional(),
  telefono: z.string().optional(),
});

export type EnvioInput = z.infer<typeof EnvioSchema>;

/**
 * Validation helper
 */
export function validateData<T>(schema: z.Schema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.flatten().fieldErrors,
      data: null,
    };
  }
  return {
    isValid: true,
    errors: null,
    data: result.data,
  };
}
