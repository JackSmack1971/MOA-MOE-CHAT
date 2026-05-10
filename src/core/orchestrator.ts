import { callModel } from './callModel';
import { DALC } from '../services/DALC';
import { RMoA } from '../services/RMoA';
import { Verifier, VerifierVerdict } from '../services/Verifier';
import { 
  selectorPrompt, 
  relevanceScoringPrompt, 
  forwardPassPrompt, 
  reversePassPrompt, 
  poolingPrompt 
} from '../prompts';
import { AgentNode } from './AgentNode';
import { SemanticCache } from '../services/SemanticCache';
import { GraphEngine } from '../services/GraphEngine';
import { ModelCard, GraphPlan, AdjacencyMatrix, PartitionedNodes } from './types';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Orchestrator Service (V2 GoA)
 * traces: FR-23, FR-24, FR-25, FR-26, FR-27, ADR-001, ADR-007
 */
export class Orchestrator {
  private static readonly SELECTOR_MODEL = 'inclusionai/ring-2.6-1t:free';
  private static readonly REGISTRY_PATH = path.join(__dirname, '../prompts/agent-registry.json');

  /**
   * Execute the Graph-of-Agents pipeline for a given query
   * traces: FR-23..27, SM-1..4
   */
  public async execute(query: string, oracleType: VerifierVerdict['oracleType'] = 'LLM_ONLY'): Promise<string> {
    logger.info({ query: query.substring(0, 50) }, '[Orchestrator] Starting V2 GoA pipeline');

    let totalUsage = { prompt: 0, completion: 0, total: 0 };
    const trackUsage = (usage: { prompt: number; completion: number; total: number }) => {
      totalUsage.prompt += usage.prompt;
      totalUsage.completion += usage.completion;
      totalUsage.total += usage.total;
    };

    // 0. Semantic Cache Lookup (ADR-008)
    const cachedResponse = await SemanticCache.get(query);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 1. Meta-LLM Selection (FR-23)
    logger.info('[Orchestrator] Step 1: Subgraph Extraction');
    const registry: ModelCard[] = JSON.parse(fs.readFileSync(Orchestrator.REGISTRY_PATH, 'utf-8'));
    const { content: selectorResponse, usage: selectorUsage } = await callModel(
      Orchestrator.SELECTOR_MODEL,
      selectorPrompt
        .replace('{{registry}}', JSON.stringify(registry, null, 2))
        .replace('{{query}}', query),
      0.1
    );
    trackUsage(selectorUsage);

    let plan: GraphPlan;
    try {
      const cleaned = selectorResponse.replace(/```json\n?|\n?```/g, '').trim();
      plan = JSON.parse(cleaned);
    } catch (err) {
      logger.error({ selectorResponse }, '[Orchestrator] Failed to parse GraphPlan. Using fallback.');
      plan = {
        selectedNodes: registry.slice(1, 4).map(m => m.id),
        poolingMethod: 'mean',
        rationale: 'Fallback due to selector parsing failure.'
      };
    }

    logger.info({ nodes: plan.selectedNodes, method: plan.poolingMethod }, '[Orchestrator] Graph Plan established');

    // 2. Initial Node Responses (Parallel)
    logger.info('[Orchestrator] Step 2: Parallel Node Execution');
    const initialResponses = new Map<string, string>();
    await Promise.all(plan.selectedNodes.map(async (nodeId) => {
      const { content, usage } = await callModel(nodeId, `Task: Provide an initial expert response to the query: ${query}`, 0.7);
      initialResponses.set(nodeId, content);
      trackUsage(usage);
    }));

    // 3. Peer-to-Peer Relevance Scoring (FR-24)
    logger.info('[Orchestrator] Step 3: Peer-to-Peer Relevance Scoring');
    const scores = new Map<string, Map<string, number>>();
    const scoringTasks: Promise<void>[] = [];

    for (const sourceId of plan.selectedNodes) {
      for (const targetId of plan.selectedNodes) {
        if (sourceId === targetId) continue;

        scoringTasks.push((async () => {
          const { content: scoreStr, usage } = await callModel(
            sourceId,
            relevanceScoringPrompt
              .replace('{{query}}', query)
              .replace('{{target_output}}', initialResponses.get(targetId)!),
            0.1
          );
          trackUsage(usage);
          const score = parseFloat(scoreStr) || 0;
          
          if (!scores.has(sourceId)) scores.set(sourceId, new Map());
          scores.get(sourceId)!.set(targetId, score);
        })());
      }
    }
    await Promise.all(scoringTasks);

    // 4. Adjacency & Partitioning (FR-25)
    logger.info('[Orchestrator] Step 4: Graph Topology Analysis');
    const adj = GraphEngine.computeAdjacency(plan.selectedNodes, scores);
    const { source, target } = GraphEngine.partitionNodes(plan.selectedNodes, adj);

    // 5. Bidirectional Message Passing (FR-26)
    // [Phase 1: Forward Pass (Source -> Target)]
    logger.info('[Orchestrator] Step 5: Bidirectional Message Passing (Forward)');
    const sourceContext = source.map(id => `Agent [${id}]: ${initialResponses.get(id)}`).join('\n\n');
    const refinedResponses = new Map<string, string>();

    await Promise.all(target.map(async (targetId) => {
      const { content: refined, usage } = await callModel(
        targetId,
        forwardPassPrompt
          .replace('{{query}}', query)
          .replace('{{initial_response}}', initialResponses.get(targetId)!)
          .replace('{{source_context}}', sourceContext),
        0.7
      );
      refinedResponses.set(targetId, refined);
      trackUsage(usage);
    }));

    // [Phase 2: Reverse Pass (Target -> Source)]
    logger.info('[Orchestrator] Step 5: Bidirectional Message Passing (Reverse)');
    const targetRefinements = target.map(id => `Refined Agent [${id}]: ${refinedResponses.get(id)}`).join('\n\n');
    const polishedResponses = new Map<string, string>();

    await Promise.all(source.map(async (sourceId) => {
      const { content: polished, usage } = await callModel(
        sourceId,
        reversePassPrompt
          .replace('{{query}}', query)
          .replace('{{initial_response}}', initialResponses.get(sourceId)!)
          .replace('{{target_refinements}}', targetRefinements),
        0.7
      );
      polishedResponses.set(sourceId, polished);
      trackUsage(usage);
    }));

    // 6. Dynamic Pooling (FR-27)
    logger.info('[Orchestrator] Step 6: Dynamic Pooling');
    let finalOutput: string;
    const allFinalResponses = [...polishedResponses.values(), ...refinedResponses.values()];

    const { content: pooledContent, usage: poolingUsage } = await callModel(
      Orchestrator.SELECTOR_MODEL,
      poolingPrompt
        .replace('{{query}}', query)
        .replace('{{agent_responses}}', allFinalResponses.join('\n\n--- Agent Break ---\n\n')),
      0.3
    );
    finalOutput = pooledContent;
    trackUsage(poolingUsage);

    // 7. Verifier Interception (FR-10, ADR-011)
    logger.info('[Orchestrator] Role: Verifier Interception');
    let verdict: VerifierVerdict;
    
    if (oracleType === 'POT_EXECUTION') {
      const codeMatch = finalOutput.match(/```(?:javascript|js)?([\s\S]*?)```/);
      verdict = await Verifier.potOracle(codeMatch ? codeMatch[1]! : finalOutput);
    } else if (oracleType === 'SYMBOLIC_EVAL') {
      verdict = Verifier.symbolicOracle(finalOutput); 
    } else {
      verdict = { verdict: 'PASS', oracleType: 'LLM_ONLY', oracleOutput: 'Conversational output passed.' };
    }

    if (verdict.verdict === 'FAIL') {
      logger.warn({ oracle: verdict.oracleType, error: verdict.oracleOutput }, '[Orchestrator] Verifier FAIL');
      const { content: revisedOutput, usage: revisionUsage } = await callModel(
        Orchestrator.SELECTOR_MODEL,
        `The previous output failed verification with the following error: ${verdict.oracleOutput}\n\nPlease provide a corrected version.\n\nOriginal Request: ${query}`,
        0.7
      );
      trackUsage(revisionUsage);
      logger.info({ totalUsage }, '[Orchestrator] Pipeline complete with revision');
      await SemanticCache.set(query, revisedOutput);
      return revisedOutput;
    }

    logger.info({ totalUsage }, '[Orchestrator] Pipeline complete');
    await SemanticCache.set(query, finalOutput);
    return finalOutput;
  }
}
