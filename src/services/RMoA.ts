import { EmbeddingService } from './EmbeddingService';

/**
 * RMoA Halt Decision Schema
 * traces: ADR-006, Blueprint §7
 */
export interface RMoAHaltDecision {
  shouldHalt: boolean;
  delta: number;
  haltReason: 'CONVERGED' | 'MAX_STEPS_EXCEEDED' | 'NOT_HALTED';
  stepCount: number;
}

/**
 * Residual MoA (RMoA) Adaptive Halting Service
 * traces: FR-07, FR-08, ADR-006
 * Monitors informational delta between successive proposer outputs.
 */
export class RMoA {
  private static readonly EPSILON = 0.02; // ADR-006
  private static readonly MAX_STEPS = 10; // FR-08

  /**
   * Check if the MoA loop should halt based on informational convergence
   * @param currentOutput Current proposer output
   * @param previousOutput Previous proposer output (null for first turn)
   * @param currentStep Current iteration count
   */
  public static async checkConvergence(
    currentOutput: string,
    previousOutput: string | null,
    currentStep: number
  ): Promise<RMoAHaltDecision> {
    if (currentStep >= this.MAX_STEPS) {
      return {
        shouldHalt: true,
        delta: 1.0, // Arbitrary high delta for max steps
        haltReason: 'MAX_STEPS_EXCEEDED',
        stepCount: currentStep
      };
    }

    if (!previousOutput) {
      return {
        shouldHalt: false,
        delta: 1.0,
        haltReason: 'NOT_HALTED',
        stepCount: currentStep
      };
    }

    const embeddingService = EmbeddingService.getInstance();
    const currentEmbed = await embeddingService.embed(currentOutput);
    const previousEmbed = await embeddingService.embed(previousOutput);

    // delta_i = ||embed(output_i) - embed(output_{i-1})||_2
    const diff = EmbeddingService.subtract(currentEmbed, previousEmbed);
    const delta = EmbeddingService.l2Norm(diff);

    if (delta < this.EPSILON) {
      return {
        shouldHalt: true,
        delta,
        haltReason: 'CONVERGED',
        stepCount: currentStep
      };
    }

    return {
      shouldHalt: false,
      delta,
      haltReason: 'NOT_HALTED',
      stepCount: currentStep
    };
  }
}
