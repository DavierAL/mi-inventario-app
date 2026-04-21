// ARCHIVO: src/core/utils/__tests__/formato.test.ts
import { formatearPrecio } from '../formato';

describe('Utilidades de Formato', () => {
    it('formatea correctamente numeros positivos', () => {
        expect(formatearPrecio(100)).toBe('S/100.00');
        expect(formatearPrecio(1250.5)).toBe('S/1,250.50');
    });

    it('maneja strings numericos', () => {
        expect(formatearPrecio('500')).toBe('S/500.00');
    });

    it('devuelve S/0.00 para valores invalidos', () => {
        expect(formatearPrecio(null)).toBe('S/0.00');
        expect(formatearPrecio(undefined)).toBe('S/0.00');
        expect(formatearPrecio('texto')).toBe('S/0.00');
    });

    it('formatea correctamente millones', () => {
        expect(formatearPrecio(1000000)).toBe('S/1,000,000.00');
    });
});
