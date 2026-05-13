import { Orchestrator } from '../src/core/orchestrator';
import { logger } from '../src/core/logger';

async function debug() {
  const orchestrator = new Orchestrator();
  try {
    const result = await orchestrator.execute('What is 2+2?');
    console.log('RESULT:', result);
  } catch (err: any) {
    console.error('CAUGHT ERROR:', err);
    if (err instanceof Error) {
      console.error('MESSAGE:', err.message);
      console.error('STACK:', err.stack);
    }
  }
}

debug();
