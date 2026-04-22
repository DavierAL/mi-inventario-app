import { 
    formatearFecha, 
    calcularDiasRestantes, 
    parseFVToTimestamp,
    formatearTiempoRelativo
} from '../fecha';

describe('Fecha Utils', () => {
    describe('formatearFecha', () => {
        it('formatea Date a DD/MM/YYYY', () => {
            const date = new Date(2023, 0, 1); // 1 Jan 2023
            expect(formatearFecha(date)).toBe('01/01/2023');
        });

        it('devuelve string vacio si la fecha es invalida', () => {
            expect(formatearFecha(null as any)).toBe('');
            expect(formatearFecha('invalid-date')).toBe('');
        });
    });

    describe('calcularDiasRestantes', () => {
        it('calcula dias restantes correctamente', () => {
            const hoy = new Date();
            const mañana = new Date(hoy);
            mañana.setDate(hoy.getDate() + 1);
            
            expect(calcularDiasRestantes(mañana)).toBe(1);
        });

        it('devuelve Infinity para valores nulos', () => {
            expect(calcularDiasRestantes(null)).toBe(Infinity);
        });
    });

    describe('formatearTiempoRelativo', () => {
        it('devuelve Hace un momento para tiempos muy cortos', () => {
            expect(formatearTiempoRelativo(Date.now())).toBe('Hace un momento');
        });

        it('devuelve Hace X min para minutos', () => {
            const fiveMinAgo = Date.now() - 5 * 60 * 1000;
            expect(formatearTiempoRelativo(fiveMinAgo)).toBe('Hace 5 min');
        });
    });
});
