import { Orchestrator } from '../src/core/orchestrator';
import { logger } from '../src/core/logger';

/**
 * SM-6: Resident Memory (RSS) Verification
 * traces: SM-6, D0-6
 * Asserts that the Node.js process stays below 6.3 GB during a pipeline run.
 */
async function verifyMemory() {
  logger.info('--- SM-6: Resident Memory Verification ---');
  const orchestrator = new Orchestrator();
  
  // Baseline
  const baseline = process.memoryUsage().rss / 1024 / 1024 / 1024;
  logger.info({ rss_gb: baseline.toFixed(2) }, 'Baseline Memory');

  // Trigger full pipeline (Code-1 example)
  const query = "Write a complete Tic-Tac-Toe game in Python with a simple AI player.";
  await orchestrator.execute(query, 'POT_EXECUTION');

  // Peak
  const peak = process.memoryUsage().rss / 1024 / 1024 / 1024;
  logger.info({ rss_gb: peak.toFixed(2) }, 'Peak Memory after Execution');

  const LIMIT_GB = 6.3;
  if (peak <= LIMIT_GB) {
    logger.info({ limit_gb: LIMIT_GB, peak_gb: peak.toFixed(2) }, 'RESULT: PASS (SM-6 Satisfied)');
  } else {
    logger.error({ limit_gb: LIMIT_GB, peak_gb: peak.toFixed(2) }, 'RESULT: FAIL (SM-6 Breach)');
    process.exit(1);
  }
}

verifyMemory().catch(err => {
  logger.error(err);
  process.exit(1);
});
