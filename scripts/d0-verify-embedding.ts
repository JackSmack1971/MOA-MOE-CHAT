import { EmbeddingService } from '../src/services/EmbeddingService';
import { performance } from 'perf_hooks';

/**
 * D0-4: Benchmark EmbeddingService
 * traces: D0-4, ADR-003
 */
async function benchmark() {
  const service = EmbeddingService.getInstance();
  
  console.log('--- D0-4: EmbeddingService Benchmark ---');
  
  // Pre-warm
  const startInit = performance.now();
  await service.init();
  const endInit = performance.now();
  console.log(`Initialization time: ${(endInit - startInit).toFixed(2)}ms`);

  const testText = 'The quick brown fox jumps over the lazy dog.';
  const iterations = 100;
  const latencies: number[] = [];

  console.log(`Running ${iterations} iterations...`);
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await service.embed(testText);
    const end = performance.now();
    latencies.push(end - start);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(iterations * 0.5)];
  const p95 = latencies[Math.floor(iterations * 0.95)];
  const avg = latencies.reduce((a, b) => a + b, 0) / iterations;

  console.log(`Average Latency: ${avg.toFixed(2)}ms`);
  console.log(`p50 Latency: ${p50.toFixed(2)}ms`);
  console.log(`p95 Latency: ${p95.toFixed(2)}ms`);

  if (p95 <= 50) {
    console.log('RESULT: PASS (p95 <= 50ms)');
  } else {
    console.log('RESULT: FAIL (p95 > 50ms)');
  }
  
  process.exit(p95 <= 50 ? 0 : 1);
}

benchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
