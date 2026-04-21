import { formatearPrecio } from '../formato';

describe('Formato Utils', () => {
    describe('formatearPrecio', () => {
        it('formatea numeros a moneda peruana (PEN)', () => {
            expect(formatearPrecio(10.5)).toBe('S/10.50');
            expect(formatearPrecio(0)).toBe('S/0.00');
        });

        it('maneja strings numericos', () => {
            expect(formatearPrecio('100')).toBe('S/100.00');
        });

        it('maneja nulos y undefined', () => {
            expect(formatearPrecio(null)).toBe('S/0.00');
            expect(formatearPrecio(undefined)).toBe('S/0.00');
        });

        it('formatea con miles', () => {
            expect(formatearPrecio(1000)).toBe('S/1,000.00');
        });
    });
});
