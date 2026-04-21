import { benchmark, assertPerformance } from '../benchmark';

describe('Benchmark Utility', () => {
    it('mide el tiempo de ejecucion correctamente', async () => {
        const { result, metrics } = await benchmark('test', async () => {
            return 42;
        });
        
        expect(result).toBe(42);
        expect(metrics.label).toBe('test');
        expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('assertPerformance lanza error si se excede el umbral', async () => {
        const slowFn = async () => {
            await new Promise(r => setTimeout(r, 10));
            return true;
        };
        
        // Con un umbral muy bajo (0ms) debería fallar
        await expect(assertPerformance('Slow', 0, slowFn)).rejects.toThrow('PERFORMANCE FAILURE');
    });

    it('assertPerformance pasa si se cumple el umbral', async () => {
        const fastFn = () => 'ok';
        const result = await assertPerformance('Fast', 100, fastFn);
        expect(result).toBe('ok');
    });
});
