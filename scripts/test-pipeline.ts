import { Orchestrator } from '../src/core/orchestrator';
import fs from 'fs';
import path from 'path';

/**
 * Objective 1.1: E2E Pipeline Verification
 * traces: Objective 1.1, SM-1
 */
async function testPipeline() {
  const orchestrator = new Orchestrator();
  const fixturesPath = path.join(__dirname, '../fixtures/golden-fixture-set.json');
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

  // Representative prompts: math-1, code-1, logic-3, conv-1, conv-5
  const testIds = ['math-1', 'code-1', 'logic-3', 'conv-1', 'conv-5'];
  const testPrompts = fixtures.filter((f: any) => testIds.includes(f.id));

  console.log('--- Objective 1.1: E2E Pipeline Verification ---');

  for (const item of testPrompts) {
    console.log(`\n[TEST] ID: ${item.id} (${item.category})`);
    console.log(`Prompt: ${item.prompt.substring(0, 100)}...`);
    
    try {
      const start = Date.now();
      const response = await orchestrator.execute(item.prompt);
      const duration = (Date.now() - start) / 1000;

      console.log(`[DONE] Duration: ${duration.toFixed(2)}s`);
      console.log(`Response Snippet: ${response.substring(0, 200)}...`);
      
      if (duration > 60) {
        console.warn(`[WARN] TTFT exceeds 60s target (Current: ${duration.toFixed(2)}s)`);
      }
    } catch (err) {
      console.error(`[ERROR] Test ${item.id} failed:`, err);
    }
  }

  console.log('\n--- Verification Finished ---');
}

testPipeline().catch(console.error);
