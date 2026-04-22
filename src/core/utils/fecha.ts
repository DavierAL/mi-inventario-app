// ARCHIVO: src/core/utils/fecha.ts

/**
 * Formatea cualquier valor de fecha al formato DD/MM/AAAA.
 * Soporta entradas en:
 *   - ISO 8601:   "2027-07-19T05:00:00.000Z"
 *   - AAAA-MM-DD: "2027-07-19"
 *   - DD/MM/AAAA: "19/07/2027"  (ya formateado, lo devuelve igual)
 *   - Date object
 * Devuelve cadena vacía si el valor no es una fecha válida.
 */
export function formatearFecha(valor: string | Date | number | null | undefined): string {
    if (!valor) return '';

    // Si ya viene en formato DD/MM/AAAA lo devolvemos tal cual
    if (typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
        return valor;
    }

    try {
        const fecha = new Date(valor);
        if (isNaN(fecha.getTime())) return '';

        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();

        return `${dia}/${mes}/${anio}`;
    } catch {
        return '';
    }
}

/**
 * Calcula cuántos días faltan para una fecha determinada comparada con "Hoy".
 * Centraliza la lógica para que la Lista y Analytics siempre muestren lo mismo.
 */
export function calcularDiasRestantes(valor: string | Date | null | undefined): number {
    if (!valor) return Infinity;
    
    const fv = formatearFecha(valor);
    if (!fv) return Infinity;

    const [dia, mes, anio] = fv.split('/').map(Number);
    const fechaVencimiento = new Date(anio, mes - 1, dia);
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diffMs = fechaVencimiento.getTime() - hoy.getTime();
    return Math.ceil(diffMs / (1000 * 3600 * 24));
}

/**
 * Convierte de Date o string (ISO/ DD/MM/AAAA) a UNIX Timestamp numérico (milisegundos).
 * Ideal para la base local SQLite / WatermelonDB.
 */
export function parseFVToTimestamp(valor: string | Date | null | undefined): number | undefined {
    if (!valor) return undefined;
    
    // Si ya es Date, retornamos
    if (valor instanceof Date) {
        if (isNaN(valor.getTime())) return undefined;
        return valor.getTime();
    }

    const fv = formatearFecha(valor);
    if (!fv) return undefined;

    const [dia, mes, anio] = fv.split('/').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return fecha.getTime();
}
/**
 * Convierte de Date o string (ISO/ DD/MM/AAAA) a objeto Date nativo.
 * Ideal para asignaciones directas a modelos de WatermelonDB con decorador @date.
 */
export function parseFVToDate(valor: string | Date | null | undefined): Date | undefined {
    const ts = parseFVToTimestamp(valor);
    if (!ts) return undefined;
    return new Date(ts);
}

/**
 * Helper interno para asegurar que siempre trabajamos con un number (Timestamp ms)
 */
export const obtenerTimestamp = (valor: any): number => {
    if (!valor || valor === 0) return Date.now();
    if (typeof valor === 'number') return valor;
    if (valor instanceof Date) {
        const time = valor.getTime();
        return isNaN(time) ? Date.now() : time;
    }
    const parsed = new Date(valor).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
};

/**
 * Devuelve una cadena legible con el tiempo transcurrido (ej: "Hace 5 min").
 */
export function formatearTiempoRelativo(rawTimestamp: any): string {
    const timestamp = obtenerTimestamp(rawTimestamp);
    const diffMs = Date.now() - timestamp;
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHrs = Math.floor(diffMs / 3_600_000);
    const diffDias = Math.floor(diffMs / 86_400_000);

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs} h`;
    if (diffDias === 1) return 'Ayer';
    return `Hace ${diffDias} días`;
}

/**
 * Devuelve la hora en formato HH:MM.
 */
export function formatearHora(rawTimestamp: any): string {
    const timestamp = obtenerTimestamp(rawTimestamp);
    return new Date(timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit'
    });
}
