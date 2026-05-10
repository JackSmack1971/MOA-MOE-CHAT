import { RMoA } from '../src/services/RMoA';
import { EmbeddingService } from '../src/services/EmbeddingService';

/**
 * RMoA Halting Unit Verification
 * traces: FR-07, FR-08, ADR-006
 */
async function testRMoA() {
  console.log('--- RMoA Halting Verification ---');

  const text1 = "The quick brown fox jumps over the lazy dog.";
  const text2 = "The quick brown fox jumps over the lazy dog."; // Identical
  const text3 = "A fast auburn canine leaps across a sleepy hound."; // Semantically similar

  // Turn 1: No previous
  console.log('\n[Test] Turn 1');
  const h1 = await RMoA.checkConvergence(text1, null, 1);
  console.log(`Halt: ${h1.shouldHalt} | Reason: ${h1.haltReason}`);

  // Turn 2: Identical (Delta should be 0)
  console.log('\n[Test] Turn 2 (Identical)');
  const h2 = await RMoA.checkConvergence(text2, text1, 2);
  console.log(`Halt: ${h2.shouldHalt} | Delta: ${h2.delta.toFixed(4)} | Reason: ${h2.haltReason}`);
  if (h2.shouldHalt && h2.haltReason === 'CONVERGED') console.log('PASS: Halted on convergence.');

  // Turn 10: Max steps
  console.log('\n[Test] Turn 10 (Max Steps)');
  const h10 = await RMoA.checkConvergence(text3, text1, 10);
  console.log(`Halt: ${h10.shouldHalt} | Reason: ${h10.haltReason}`);
  if (h10.shouldHalt && h10.haltReason === 'MAX_STEPS_EXCEEDED') console.log('PASS: Halted on max steps.');

  console.log('\n--- RMoA Verification Finished ---');
}

testRMoA().catch(console.error);
