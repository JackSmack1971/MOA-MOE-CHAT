import { Orchestrator } from '../src/core/orchestrator';
import { logger } from '../src/core/logger';
import * as dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  const orchestrator = new Orchestrator();
  const queries = [
    "Hi", // Trivial -> Early exit
    "What is the capital of France?", // Simple -> Cheap model selection
    "Describe the architectural evolution of micro-services from monolithic designs to serverless functions, including trade-offs in observability and consistency." // Complex -> Premium synthesis
  ];

  for (const query of queries) {
    console.log(`\n\n=== TESTING QUERY: ${query} ===`);
    try {
      const generator = orchestrator.executeStreaming(query);
      for await (const event of generator) {
        if (event.type === 'status') {
          console.log(`[STATUS] ${event.data}`);
        }
        if (event.type === 'final') {
          console.log(`[FINAL OUTPUT RECEIVED]`);
        }
      }
    } catch (err) {
      console.error(`Error processing query: ${query}`, err);
    }
  }
}

runTest().catch(console.error);
