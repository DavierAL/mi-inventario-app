// ARCHIVO: src/core/utils/formato.ts
export function formatearPrecio(precio: number | string | undefined | null): string {
    if (precio === undefined || precio === null) return 'S/0.00';
    const num = Number(precio);
    if (isNaN(num)) return 'S/0.00';

    // Formato con separadores de miles y dos decimales
    return 'S/' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
