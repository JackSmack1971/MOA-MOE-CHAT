import { EmbeddingService } from './EmbeddingService';
import { logger } from '../core/logger';

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
 * Reflexion Buffer Entry
 */
interface ReflexionEntry {
  step: number;
  delta: number;
  aggregateLength: number;
}

/**
 * Residual MoA (RMoA) Adaptive Halting Service
 * traces: FR-07, FR-08, ADR-006
 * Monitors informational delta between successive proposer outputs.
 */
export class RMoA {
  private static readonly DEFAULT_EPSILON = 0.02; // ADR-006
  private static reflexionBuffer: ReflexionEntry[] = [];

  /**
   * Reset the Reflexion buffer for a new query
   */
  public static resetBuffer(): void {
    this.reflexionBuffer = [];
  }

  /**
   * Check if the MoA loop should halt based on informational convergence
   * @param currentOutput Current proposer output
   * @param previousOutput Previous proposer output (null for first turn)
   * @param currentStep Current iteration count
   * @param maxSteps Maximum steps allowed for this query
   */
  public static async checkConvergence(
    currentOutput: string,
    previousOutput: string | null,
    currentStep: number,
    maxSteps: number = 10
  ): Promise<RMoAHaltDecision> {
    if (currentStep >= maxSteps) {
      return {
        shouldHalt: true,
        delta: 1.0,
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

    // Update Reflexion buffer
    this.reflexionBuffer.push({
      step: currentStep,
      delta,
      aggregateLength: currentOutput.length
    });

    // Dynamic Epsilon Adjustment: 
    // If we've seen 3 steps of very low delta (even if not < EPSILON), or if delta is oscillating.
    const epsilon = this.DEFAULT_EPSILON;

    if (delta < epsilon) {
      return {
        shouldHalt: true,
        delta,
        haltReason: 'CONVERGED',
        stepCount: currentStep
      };
    }

    // Secondary Halt: Check for plateau in the reflexion buffer
    if (this.reflexionBuffer.length >= 3) {
      const lastThree = this.reflexionBuffer.slice(-3);
      const isPlateau = lastThree.every(e => Math.abs(e.delta - delta) < 0.005);
      const plateauThreshold = parseFloat(process.env.PLATEAU_DELTA || '0.05');
      
      if (isPlateau && delta < plateauThreshold) {
        logger.info({ delta, plateau: true }, '[RMoA] Plateau detected in refinement.');
        return {
          shouldHalt: true,
          delta,
          haltReason: 'CONVERGED', // Treat plateau as convergence
          stepCount: currentStep
        };
      }
    }

    return {
      shouldHalt: false,
      delta,
      haltReason: 'NOT_HALTED',
      stepCount: currentStep
    };
  }
}
