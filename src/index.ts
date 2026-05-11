import { spawn } from 'child_process';
import open from 'open';
import { logger } from './core/logger';
import path from 'path';
import fs from 'fs';

/**
 * V3 Solo-Deployable Orchestrator
 * traces: PRD §5.5, ADR-013
 */
async function bootstrap() {
  logger.info('--- MoA-MoE-Chatbot V3 Bootstrapping ---');

  // 1. Database Orchestration (Local Postgres Sidecar)
  const pgPath = process.env.PGDATA || path.join(process.cwd(), 'data/db');
  
  if (!fs.existsSync(pgPath)) {
    logger.info('[Sidecar] Initializing local database...');
    try {
      fs.mkdirSync(pgPath, { recursive: true });
      const init = spawn('initdb', ['-D', pgPath], { stdio: 'inherit' });
      init.on('error', () => logger.warn('[Sidecar] initdb not found. Skipping DB init.'));
    } catch (err) {
      logger.warn('[Sidecar] Failed to initialize DB. Ensure postgres is in PATH.');
    }
  }

  logger.info('[Sidecar] Starting PostgreSQL...');
  try {
    const pgProcess = spawn('postgres', ['-D', pgPath], { stdio: 'ignore' });
    pgProcess.on('error', () => logger.warn('[Sidecar] postgres binary not found. Running without local DB.'));
  } catch (err) {
    logger.warn('[Sidecar] Failed to start Postgres.');
  }

  // 2. Graceful Shutdown
  const cleanup = () => {
    logger.info('[Sidecar] Shutting down PostgreSQL...');
    pgProcess.kill('SIGTERM');
    process.exit();
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  // 3. Start Backend Server
  logger.info('[Core] Starting Express Backend...');
  require('./server');

  // 4. Auto-Launch UI
  const port = process.env.PORT || 3000;
  setTimeout(async () => {
    logger.info(`[Launcher] Opening UI in default browser...`);
    await open(`http://localhost:${port}`);
  }, 2000);
}

bootstrap().catch(err => {
  logger.error({ error: err.message }, '[Bootstrap] Fatal Error');
  process.exit(1);
});
