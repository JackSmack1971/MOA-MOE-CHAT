import { callModel } from './callModel';
import { DALC } from '../services/DALC';
import { routerPrompt, proposerPrompt, aggregatorPrompt } from '../prompts';
import { AgentNode } from './AgentNode';

/**
 * Orchestrator Service
 * traces: FR-01, FR-02, FR-04, FR-05, ADR-001, PRD §6.1
 */
export class Orchestrator {
  private static readonly MODEL_ID = 'nvidia/nemotron-3-super-120b-a12b:free';

  /**
   * Execute the Self-MoA pipeline for a given query
   * traces: Objective 1.1
   */
  public async execute(query: string): Promise<string> {
    console.log(`[Orchestrator] Starting pipeline for query: "${query.substring(0, 50)}..."`);

    // 1. Router Turn
    console.log('[Orchestrator] Role: Router');
    const routerPlan = await callModel(
      Orchestrator.MODEL_ID,
      routerPrompt.replace('{{query}}', query),
      0.7
    );

    // 2. Proposer Turn (with DALC integration)
    console.log('[Orchestrator] Role: Proposer');
    const proposerNode: AgentNode = {
      id: 'proposer',
      modelIdentifier: Orchestrator.MODEL_ID,
      personaPrompt: proposerPrompt,
      temperature: 0.7
    };

    const initialProposerOutput = await callModel(
      proposerNode.modelIdentifier,
      proposerNode.personaPrompt
        .replace('{{persona_instruction}}', 'You are a domain expert.')
        .replace('{{plan}}', routerPlan)
        .replace('{{query}}', query)
        .replace('{{orthogonality_directive}}', ''),
      proposerNode.temperature
    );

    // 3. DALC Diversity Enforcement
    console.log('[Orchestrator] Running DALC check...');
    const dalcResult = await DALC.enforce(
      initialProposerOutput,
      routerPlan,
      async (directive) => {
        return await callModel(
          proposerNode.modelIdentifier,
          proposerNode.personaPrompt
            .replace('{{persona_instruction}}', 'You are a domain expert.')
            .replace('{{plan}}', routerPlan)
            .replace('{{query}}', query)
            .replace('{{orthogonality_directive}}', directive),
          proposerNode.temperature
        );
      }
    );

    // 4. Aggregator Turn
    console.log('[Orchestrator] Role: Aggregator');
    const finalResponse = await callModel(
      Orchestrator.MODEL_ID,
      aggregatorPrompt
        .replace('{{dalc_score}}', dalcResult.similarity.toFixed(4))
        .replace('{{dalc_status}}', dalcResult.status)
        .replace('{{proposer_response}}', dalcResult.finalOutput)
        .replace('{{query}}', query),
      0.2 // ADR-009: Low temperature for Aggregator
    );

    console.log('[Orchestrator] Pipeline finished.');
    return finalResponse;
  }
}
