// ARCHIVO: src/hooks/useHistorial.ts
import { useState, useEffect } from 'react';
import { EntradaHistorial } from '../../../core/types/inventario';
import { InventarioRepository } from '../../inventory/repository/inventarioRepository';

interface HistorialState {
    entradas: EntradaHistorial[];
    cargando: boolean;
    error: string | null;
}

/**
 * Hook reactivo que expone los últimos 50 movimientos del historial
 * en tiempo real mediante onSnapshot de Firestore.
 */
import { formatearFecha } from '../../../core/utils/fecha';
import Movimiento from '../../../core/database/models/Movimiento';

/**
 * Hook que adapta los modelos de WatermelonDB al formato esperado por la UI (EntradaHistorial)
 */
export const useHistorial = (movimientos: Movimiento[]): HistorialState => {
    const entradas = movimientos.map(m => ({
        id: m.id,
        productoId: m.productoId,
        descripcion: m.descripcion,
        marca: m.marca,
        sku: m.sku,
        accion: m.accion as any,
        cambios: {
            fvAnterior: m.fvAnteriorTs ? formatearFecha(m.fvAnteriorTs) : undefined,
            fvNuevo: m.fvNuevoTs ? formatearFecha(m.fvNuevoTs) : undefined,
            comentario: m.comentario
        },
        timestamp: m.timestamp,
        dispositivo: m.dispositivo
    }));

    return { 
        entradas, 
        cargando: false, 
        error: null 
    };
};

