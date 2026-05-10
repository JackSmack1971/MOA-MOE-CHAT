import { Orchestrator } from '../src/core/orchestrator';
import { DbService } from '../src/services/DbService';

/**
 * SM-4: Semantic Cache Hit Rate Verification
 * traces: SM-4, ADR-008
 */
async function testCache() {
  console.log('--- SM-4: Semantic Cache Verification ---');
  const orchestrator = new Orchestrator();
  const dbService = DbService.getInstance();

  // 1. Clear cache (optional, but good for clean test)
  // await dbService.pool.query("DELETE FROM agent_memory WHERE metadata->>'type' = 'cache'");

  const testPairs = [
    { q1: "What is the capital of France?", q2: "Tell me the capital of France." },
    { q1: "Solve 2+2.", q2: "What is 2 plus 2?" },
    { q1: "Write a hello world in Python.", q2: "Python hello world code please." },
    { q1: "Who won the World Cup in 2022?", q2: "2022 World Cup winner?" },
    { q1: "Explain gravity simply.", q2: "What is gravity? Explain to a child." }
  ];

  let hits = 0;

  for (let i = 0; i < testPairs.length; i++) {
    const pair = testPairs[i]!;
    console.log(`\n[Pair ${i+1}] Original: "${pair.q1}"`);
    
    // Store in cache
    await orchestrator.execute(pair.q1);

    console.log(`[Pair ${i+1}] Similar: "${pair.q2}"`);
    const start = Date.now();
    const response = await orchestrator.execute(pair.q2);
    const duration = Date.now() - start;

    // A cache hit should be very fast (< 1s vs 100s for MoA)
    if (duration < 5000) {
      hits++;
      console.log(`[HIT] Pair ${i+1} satisfied via cache. Duration: ${duration}ms`);
    } else {
      console.log(`[MISS] Pair ${i+1} triggered full pipeline. Duration: ${duration}ms`);
    }
  }

  const hitRate = (hits / testPairs.length) * 100;
  console.log(`\nCache Hit Rate: ${hitRate}%`);
  
  if (hitRate >= 40) {
    console.log('RESULT: PASS (SM-4 Satisfied)');
  } else {
    console.log('RESULT: FAIL (SM-4 Breach)');
  }

  await dbService.close();
}

testCache().catch(console.error);
