// ARCHIVO: src/core/utils/__tests__/fecha.test.ts
import { 
    formatearFecha, 
    calcularDiasRestantes, 
    parseFVToTimestamp, 
    formatearTiempoRelativo,
    obtenerTimestamp
} from '../fecha';

describe('Utilidades de Fecha', () => {
    describe('formatearFecha', () => {
        it('formatea correctamente una fecha ISO', () => {
            expect(formatearFecha('2027-07-19T05:00:00.000Z')).toBe('19/07/2027');
        });

        it('devuelve el mismo valor si ya esta formateado', () => {
            expect(formatearFecha('15/05/2026')).toBe('15/05/2026');
        });

        it('maneja objetos Date correctamente', () => {
            const date = new Date(Date.UTC(2025, 0, 1)); // 1 de Enero 2025 UTC
            expect(formatearFecha(date)).toBe('01/01/2025');
        });

        it('devuelve cadena vacia para valores invalidos', () => {
            expect(formatearFecha(null)).toBe('');
            expect(formatearFecha(undefined)).toBe('');
            expect(formatearFecha('no-es-una-fecha')).toBe('');
        });
    });

    describe('calcularDiasRestantes', () => {
        beforeAll(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        it('calcula dias correctamente para fecha futura', () => {
            // Hoy es 2024-01-01
            expect(calcularDiasRestantes('2024-01-10')).toBe(9);
        });

        it('devuelve 0 para el mismo dia', () => {
            expect(calcularDiasRestantes('2024-01-01')).toBe(0);
        });

        it('devuelve valor negativo para fechas pasadas', () => {
            expect(calcularDiasRestantes('2023-12-31')).toBe(-1);
        });

        it('devuelve Infinity para valores invalidos', () => {
            expect(calcularDiasRestantes(null)).toBe(Infinity);
        });
    });

    describe('parseFVToTimestamp', () => {
        it('convierte DD/MM/AAAA a timestamp de medianoche local', () => {
            const ts = parseFVToTimestamp('01/01/2025');
            const date = new Date(ts!);
            expect(date.getFullYear()).toBe(2025);
            expect(date.getMonth()).toBe(0);
            expect(date.getDate()).toBe(1);
        });

        it('devuelve undefined para valores invalidos', () => {
            expect(parseFVToTimestamp(null)).toBe(undefined);
        });
    });

    describe('formatearTiempoRelativo', () => {
        beforeAll(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
        });

        it('muestra "Hace un momento" para tiempo muy reciente', () => {
            const now = Date.now();
            expect(formatearTiempoRelativo(now - 10000)).toBe('Hace un momento');
        });

        it('muestra minutos correctamente', () => {
            const now = Date.now();
            expect(formatearTiempoRelativo(now - 300000)).toBe('Hace 5 min');
        });

        it('muestra horas correctamente', () => {
            const now = Date.now();
            expect(formatearTiempoRelativo(now - 7200000)).toBe('Hace 2 h');
        });
    });
});
