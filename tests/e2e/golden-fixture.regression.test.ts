import { describe, it, expect, vi } from 'vitest';
import { Orchestrator } from '../../src/core/orchestrator';
import { logger } from '../../src/core/logger';
import fs from 'fs';
import path from 'path';

/**
 * Phase 6 Gatekeeper: Golden Fixture Regression
 * traces: Objective 1.1, SM-1..7, D0-1..6
 */
describe('Golden Fixture Regression', () => {
  const orchestrator = new Orchestrator();
  const fixturePath = path.join(__dirname, '../../fixtures/golden-fixture-set.json');
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  // Increase timeout for long-running LLM calls
  it('should pass all golden fixtures', { timeout: 300000 }, async () => {
    let total = 0;
    let passed = 0;

    for (const fixture of fixtures) {
      total++;
      try {
        let oracleType: any = 'LLM_ONLY';
        if (fixture.oracleType === 'mathjs') oracleType = 'SYMBOLIC_EVAL';
        if (fixture.oracleType === 'PoT') oracleType = 'POT_EXECUTION';

        await orchestrator.execute(fixture.prompt, oracleType);
        passed++;
      } catch (err: any) {
        console.error(`FAIL [${fixture.id}]: ${err.message}`);
      }
    }

    const passRate = (passed / total) * 100;
    expect(passRate).toBe(100);
  });
});
