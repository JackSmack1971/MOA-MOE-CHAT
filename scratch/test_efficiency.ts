import { Orchestrator } from '../src/core/orchestrator';
import { logger } from '../src/core/logger';
import * as dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  const orchestrator = new Orchestrator();
  const queries = [
    "What is 2+2?", // Simple
    "Explain the implications of quantum entanglement on faster-than-light communication in a multi-verse theory context.", // Complex
    "Write a short poem about a cat that likes to eat pizza but only on Tuesdays." // Medium
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
