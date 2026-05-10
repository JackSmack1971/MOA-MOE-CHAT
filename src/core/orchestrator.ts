import { callModel } from './callModel';
import { DALC } from '../services/DALC';
import { RMoA, RMoAHaltDecision } from '../services/RMoA';
import { Verifier, VerifierVerdict } from '../services/Verifier';
import { routerPrompt, proposerPrompt, aggregatorPrompt } from '../prompts';
import { AgentNode } from './AgentNode';

import { SemanticCache } from '../services/SemanticCache';

import { logger } from './logger';

/**
 * Orchestrator Service
 * traces: FR-01, FR-02, FR-04, FR-05, FR-07..12, ADR-001, ADR-006, ADR-011, PRD §6.1
 */
export class Orchestrator {
  private static readonly MODEL_ID = 'nvidia/nemotron-3-super-120b-a12b:free';

  /**
   * Execute the Self-MoA pipeline for a given query
   * traces: Objective 1.1, SM-1..4
   */
  public async execute(query: string, oracleType: VerifierVerdict['oracleType'] = 'LLM_ONLY'): Promise<string> {
    logger.info({ query: query.substring(0, 50) }, '[Orchestrator] Starting pipeline');

    // 0. Semantic Cache Lookup (ADR-008)
    const cachedResponse = await SemanticCache.get(query);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 1. Router Turn
    logger.info('[Orchestrator] Role: Router');
    const routerPlan = await callModel(
      Orchestrator.MODEL_ID,
      routerPrompt.replace('{{query}}', query),
      0.7
    );

    let currentStep = 1;
    let previousOutput: string | null = null;
    let lastAggregatorOutput: string = '';
    let haltDecision: RMoAHaltDecision | null = null;

    // RMoA Adaptive Halting Loop (ADR-006)
    while (true) {
      logger.info({ currentStep }, '[Orchestrator] Starting iteration');

      // 2. Proposer Turn (with DALC integration)
      logger.info({ currentStep }, '[Orchestrator] Role: Proposer');
      const proposerNode: AgentNode = {
        id: `proposer-${currentStep}`,
        modelIdentifier: Orchestrator.MODEL_ID,
        personaPrompt: proposerPrompt,
        temperature: 0.7
      };

      const initialProposerOutput = await callModel(
        proposerNode.modelIdentifier,
        proposerNode.personaPrompt
          .replace('{{persona_instruction}}', `You are a domain expert. Step ${currentStep}.`)
          .replace('{{plan}}', routerPlan)
          .replace('{{query}}', query)
          .replace('{{orthogonality_directive}}', ''),
        proposerNode.temperature
      );

      // 3. DALC Diversity Enforcement
      const dalcResult = await DALC.enforce(
        initialProposerOutput,
        routerPlan,
        async (directive) => {
          return await callModel(
            proposerNode.modelIdentifier,
            proposerNode.personaPrompt
              .replace('{{persona_instruction}}', `You are a domain expert. Step ${currentStep}.`)
              .replace('{{plan}}', routerPlan)
              .replace('{{query}}', query)
              .replace('{{orthogonality_directive}}', directive),
            proposerNode.temperature
          );
        }
      );

      // 4. Aggregator Turn (Synthesis)
      logger.info({ currentStep }, '[Orchestrator] Role: Aggregator');
      lastAggregatorOutput = await callModel(
        Orchestrator.MODEL_ID,
        aggregatorPrompt
          .replace('{{dalc_score}}', dalcResult.similarity.toFixed(4))
          .replace('{{dalc_status}}', dalcResult.status)
          .replace('{{proposer_response}}', dalcResult.finalOutput)
          .replace('{{query}}', query),
        0.2
      );

      // 5. RMoA Halting Check
      haltDecision = await RMoA.checkConvergence(
        dalcResult.finalOutput,
        previousOutput,
        currentStep
      );

      logger.info({ delta: haltDecision.delta.toFixed(4), reason: haltDecision.haltReason }, '[Orchestrator] RMoA Check');

      if (haltDecision.shouldHalt) {
        logger.info({ reason: haltDecision.haltReason }, '[Orchestrator] Halting triggered');
        break;
      }

      previousOutput = dalcResult.finalOutput;
      currentStep++;
    }

    // 6. Verifier Interception (FR-10, ADR-011)
    logger.info('[Orchestrator] Role: Verifier Interception');
    let verdict: VerifierVerdict;
    
    // Minimal heuristic to find code/math in output for oracle dispatch
    if (oracleType === 'POT_EXECUTION') {
      const codeMatch = lastAggregatorOutput.match(/```(?:javascript|js)?([\s\S]*?)```/);
      verdict = await Verifier.potOracle(codeMatch ? codeMatch[1]! : lastAggregatorOutput);
    } else if (oracleType === 'SYMBOLIC_EVAL') {
      // Heuristic: find last numeric expression or block
      verdict = Verifier.symbolicOracle(lastAggregatorOutput); 
    } else {
      verdict = { verdict: 'PASS', oracleType: 'LLM_ONLY', oracleOutput: 'Conversational output passed.' };
    }

    if (verdict.verdict === 'FAIL') {
      logger.warn({ oracle: verdict.oracleType, error: verdict.oracleOutput }, '[Orchestrator] Verifier FAIL');
      // FR-11: Trigger one revision if failed
      logger.info('[Orchestrator] Role: Proposer (Revision)');
      const revisedOutput = await callModel(
        Orchestrator.MODEL_ID,
        `The previous output failed verification with the following error: ${verdict.oracleOutput}\n\nPlease provide a corrected version.\n\nOriginal Request: ${query}`,
        0.7
      );
      await SemanticCache.set(query, revisedOutput);
      return revisedOutput;
    }

    await SemanticCache.set(query, lastAggregatorOutput);
    return lastAggregatorOutput;
  }
}
