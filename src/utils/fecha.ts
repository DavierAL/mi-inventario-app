// ARCHIVO: src/utils/fecha.ts

/**
 * Formatea cualquier valor de fecha al formato DD/MM/AAAA.
 * Soporta entradas en:
 *   - ISO 8601:   "2027-07-19T05:00:00.000Z"
 *   - AAAA-MM-DD: "2027-07-19"
 *   - DD/MM/AAAA: "19/07/2027"  (ya formateado, lo devuelve igual)
 *   - Date object
 * Devuelve cadena vacía si el valor no es una fecha válida.
 */
export function formatearFecha(valor: string | Date | null | undefined): string {
    if (!valor) return '';

    // Si ya viene en formato DD/MM/AAAA lo devolvemos tal cual
    if (typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
        return valor;
    }

    try {
        const fecha = new Date(valor as string);
        if (isNaN(fecha.getTime())) return '';

        const dia = String(fecha.getUTCDate()).padStart(2, '0');
        const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const anio = fecha.getUTCFullYear();

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
