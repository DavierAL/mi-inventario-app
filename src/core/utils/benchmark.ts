/**
 * Benchmark Utility
 * Measures execution time of sync or async functions.
 */

export interface BenchmarkResult {
  durationMs: number;
  label: string;
}

export async function benchmark<T>(
  label: string,
  fn: () => T | Promise<T>
): Promise<{ result: T; metrics: BenchmarkResult }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  const metrics: BenchmarkResult = {
    durationMs: parseFloat((end - start).toFixed(2)),
    label,
  };

  console.log(`[BENCHMARK] ${label}: ${metrics.durationMs}ms`);
  
  return { result, metrics };
}

/**
 * Asserts that a function executes within a specific time limit.
 */
export async function assertPerformance<T>(
  label: string,
  thresholdMs: number,
  fn: () => T | Promise<T>
): Promise<T> {
  const { result, metrics } = await benchmark(label, fn);
  
  if (metrics.durationMs > thresholdMs) {
    throw new Error(
      `PERFORMANCE FAILURE: ${label} took ${metrics.durationMs}ms (threshold: ${thresholdMs}ms)`
    );
  }
  
  return result;
}
