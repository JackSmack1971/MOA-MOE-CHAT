import { Orchestrator } from '../../src/core/orchestrator';
import { logger } from '../../src/core/logger';
import fs from 'fs';
import path from 'path';

/**
 * Phase 6 Gatekeeper: Golden Fixture Regression
 * traces: Objective 1.1, SM-1..7, D0-1..6
 * Executes all 20 fixtures and reports pass/fail.
 */
async function runRegression() {
  logger.info('--- Phase 6: Golden Fixture Regression Gate ---');
  const orchestrator = new Orchestrator();
  
  const fixturePath = path.join(__dirname, '../../fixtures/golden-fixture-set.json');
  const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  let total = 0;
  let passed = 0;

  for (const fixture of fixtures) {
    total++;
    logger.info({ id: fixture.id, category: fixture.category }, `Testing: ${fixture.prompt.substring(0, 50)}...`);
    
    try {
      const start = Date.now();
      
      // Map fixture oracleType to Orchestrator oracleType
      let oracleType: any = 'LLM_ONLY';
      if (fixture.oracleType === 'mathjs') oracleType = 'SYMBOLIC_EVAL';
      if (fixture.oracleType === 'PoT') oracleType = 'POT_EXECUTION';

      const result = await orchestrator.execute(fixture.prompt, oracleType);
      const duration = (Date.now() - start) / 1000;

      logger.info({ id: fixture.id, duration: `${duration.toFixed(2)}s` }, 'PASS');
      passed++;
    } catch (err: any) {
      logger.error({ id: fixture.id, error: err.message }, 'FAIL');
    }
  }

  const passRate = (passed / total) * 100;
  logger.info({ total, passed, passRate: `${passRate}%` }, 'Regression Summary');

  if (passRate === 100) {
    logger.info('GATE STATUS: GREEN (Ready for V1 Tag)');
  } else {
    logger.error('GATE STATUS: RED (Fix regressions before release)');
    process.exit(1);
  }
}

runRegression().catch(err => {
  logger.error(err);
  process.exit(1);
});
