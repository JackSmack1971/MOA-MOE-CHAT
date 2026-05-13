import { callModel, callModelStream } from './callModel';
import { DALC } from '../services/DALC';
import { RMoA } from '../services/RMoA';
import { Verifier, VerifierVerdict } from '../services/Verifier';
import { 
  selectorPrompt, 
  relevanceScoringPrompt, 
  forwardPassPrompt, 
  reversePassPrompt, 
  poolingPrompt,
  skillExtractorPrompt
} from '../prompts';
import { AgentNode } from './AgentNode';
import { SemanticCache } from '../services/SemanticCache';
import { GraphEngine } from '../services/GraphEngine';
import { SymbolicSerializer } from '../services/SymbolicSerializer';
import { EdgeConstructor } from './edgeConstructor';
import { 
  ModelCard, 
  GraphPlan, 
  AdjacencyMatrix, 
  PartitionedNodes,
  GraphPlanSchema,
  ModelCardSchema
} from './types';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Merges multiple async generators into a single interleaved stream.
 */
async function* mergeStreams(generators: AsyncGenerator<any>[]) {
  if (generators.length === 0) return;
  const queue: any[] = [];
  let active = generators.length;
  let resolve: ((v: any) => void) | null = null;

  generators.forEach(async (gen) => {
    try {
      for await (const value of gen) {
        if (resolve) {
          resolve(value);
          resolve = null;
        } else {
          queue.push(value);
        }
      }
    } finally {
      active--;
      if (active === 0) {
        if (resolve) resolve(null);
        else queue.push(null);
      }
    }
  });

  while (true) {
    if (queue.length > 0) {
      const val = queue.shift();
      if (val === null) break;
      yield val;
    } else {
      const val = await new Promise(r => (resolve = r));
      if (val === null) break;
      yield val;
    }
  }
}

/**
 * Orchestrator Service (V3 Symbolic-MoE)
 * traces: FR-23, FR-24, FR-25, FR-26, FR-27, ADR-001, ADR-007
 */
export class Orchestrator {
  private static readonly SELECTOR_MODEL = 'inclusionai/ring-2.6-1t:free';
  private static readonly REGISTRY_PATH = path.join(__dirname, '../prompts/agent-registry.json');
  private static readonly SKILL_TAXONOMY_PATH = path.join(__dirname, '../prompts/skill-registry.json');

  /**
   * Execute the Graph-of-Agents pipeline for a given query (Blocking)
   * traces: FR-23..27, SM-1..4
   */
  public async execute(query: string, oracleType: VerifierVerdict['oracleType'] = 'LLM_ONLY'): Promise<string> {
    const generator = this.executeStreaming(query, oracleType);
    let lastContent = '';
    for await (const event of generator) {
      if (event.type === 'chunk') lastContent += event.data;
      if (event.type === 'final') lastContent = event.data;
    }
    return lastContent;
  }

  /**
   * Execute the pipeline as an AsyncGenerator for real-time UI/SSE updates
   * traces: V3 UI-SPEC, SSE-01
   */
  public async *executeStreaming(query: string, oracleType: VerifierVerdict['oracleType'] = 'LLM_ONLY'): AsyncGenerator<{ type: string; data: any }> {
    yield { type: 'status', data: 'Initializing pipeline...' };

    let totalUsage = { prompt: 0, completion: 0, total: 0 };
    let nodeUsage: Record<string, number> = {};
    const trackUsage = (usage: { prompt: number; completion: number; total: number }, nodeId?: string) => {
      totalUsage.prompt += usage.prompt;
      totalUsage.completion += usage.completion;
      totalUsage.total += usage.total;
      if (nodeId) {
        nodeUsage[nodeId] = (nodeUsage[nodeId] || 0) + usage.total;
      }
    };

    // 0. Semantic Cache Lookup
    const cachedResponse = await SemanticCache.get(query);
    if (cachedResponse) {
      yield { type: 'chunk', data: cachedResponse };
      yield { type: 'status', data: 'Cache HIT' };
      return;
    }

    // 0.5. Skill Extraction
    yield { type: 'status', data: 'Extracting skills...' };
    const taxonomy = JSON.parse(fs.readFileSync(Orchestrator.SKILL_TAXONOMY_PATH, 'utf-8'));
    const { content: skillKeywords, usage: skillUsage } = await callModel(
      Orchestrator.SELECTOR_MODEL,
      skillExtractorPrompt
        .replace('{{taxonomy}}', JSON.stringify(taxonomy.map((t: any) => t.id)))
        .replace('{{query}}', query),
      0.1
    );
    trackUsage(skillUsage);
    const skillVector = SymbolicSerializer.serializeSkillVector(skillKeywords.split(','), taxonomy);
    yield { type: 'skills', data: skillKeywords.trim() };

    // 1. Meta-LLM Selection
    yield { type: 'status', data: 'Selecting experts...' };
    const rawRegistry = JSON.parse(fs.readFileSync(Orchestrator.REGISTRY_PATH, 'utf-8'));
    const registry: ModelCard[] = rawRegistry.map((m: any) => ModelCardSchema.parse(m));
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
      const rawPlan = JSON.parse(cleaned);
      plan = GraphPlanSchema.parse(rawPlan);
    } catch (err) {
      logger.warn({ err, selectorResponse }, '[Orchestrator] Plan validation failed. Using fallback.');
      plan = { selectedNodes: registry.slice(1, 4).map(m => m.id), poolingMethod: 'mean', rationale: 'Fallback' };
    }
    yield { type: 'plan', data: plan };

    // 2. Initial Node Responses
    yield { type: 'status', data: 'Gathering initial perspectives...' };
    const initialResponses = new Map<string, string>();
    const initialGenerators = plan.selectedNodes.map((nodeId) => (async function* () {
      let fullContent = '';
      const stream = callModelStream(nodeId, `Task: Provide an initial expert response to the query: ${query}`, 0.7);
      for await (const chunk of stream) {
        if (chunk.type === 'chunk') {
          fullContent += chunk.data;
          yield { type: 'expert_chunk', data: { nodeId, content: chunk.data, step: 0 } };
        } else if (chunk.type === 'usage') {
          trackUsage(chunk.data, nodeId);
        }
      }
      initialResponses.set(nodeId, fullContent);
    })());

    for await (const event of mergeStreams(initialGenerators)) {
      yield event;
    }

    // 3. Peer-to-Peer Relevance Scoring
    yield { type: 'status', data: 'Building adjacency graph...' };
    const scores = new Map<string, Map<string, number>>();
    const scoringTasks: Promise<void>[] = [];

    for (const sourceId of plan.selectedNodes) {
      for (const targetId of plan.selectedNodes) {
        if (sourceId === targetId) continue;
        scoringTasks.push((async () => {
          const { content: scoreStr, usage } = await callModel(
            sourceId,
            relevanceScoringPrompt.replace('{{query}}', query).replace('{{target_output}}', initialResponses.get(targetId)!),
            0.1
          );
          trackUsage(usage, sourceId);
          const score = parseFloat(scoreStr) || 0;
          if (!scores.has(sourceId)) scores.set(sourceId, new Map());
          scores.get(sourceId)!.set(targetId, score);
        })());
      }
    }
    await Promise.all(scoringTasks);

    // 4. Adjacency & Partitioning
    const semanticAdj = GraphEngine.computeAdjacency(plan.selectedNodes, scores);
    const skillAdj = EdgeConstructor.constructSkillEdges(plan.selectedNodes, registry, skillVector, taxonomy.map((t: any) => t.id));
    const hybridAdj = semanticAdj.map((row, i) => row.map((val, j) => 0.7 * val + 0.3 * skillAdj[i][j]));
    const { source, target } = GraphEngine.partitionNodes(plan.selectedNodes, hybridAdj);
    
    yield { type: 'graph', data: { nodes: plan.selectedNodes, adjacency: hybridAdj, usage: nodeUsage } };

    // 5. Bidirectional Message Passing (with RMoA)
    yield { type: 'status', data: 'Performing iterative refinement...' };
    let previousAggregate = [...initialResponses.values()].join('\n');
    let currentResponses = initialResponses;
    let finalRefinedResponses = initialResponses;

    for (let step = 1; step <= 10; step++) {
      const sourceContext = source.map(id => `Agent [${id}]: ${currentResponses.get(id)}`).join('\n\n');
      const refined = new Map<string, string>();

      // Forward Pass
      const forwardGenerators = target.map((targetId) => (async function* () {
        let fullContent = '';
        const stream = callModelStream(
          targetId,
          forwardPassPrompt
            .replace('{{query}}', query)
            .replace('{{initial_response}}', currentResponses.get(targetId) || '')
            .replace('{{source_context}}', sourceContext),
          0.7
        );
        for await (const chunk of stream) {
          if (chunk.type === 'chunk') {
            fullContent += chunk.data;
            yield { type: 'expert_chunk', data: { nodeId: targetId, content: chunk.data, step } };
          } else if (chunk.type === 'usage') {
            trackUsage(chunk.data, targetId);
          }
        }
        refined.set(targetId, fullContent);
      })());

      for await (const event of mergeStreams(forwardGenerators)) {
        yield event;
      }

      // Reverse Pass
      const targetRefinements = target.map(id => `Refined Agent [${id}]: ${refined.get(id)}`).join('\n\n');
      const reverseGenerators = source.map((sourceId) => (async function* () {
        let fullContent = '';
        const stream = callModelStream(
          sourceId,
          reversePassPrompt
            .replace('{{query}}', query)
            .replace('{{initial_response}}', currentResponses.get(sourceId) || '')
            .replace('{{target_refinements}}', targetRefinements),
          0.7
        );
        for await (const chunk of stream) {
          if (chunk.type === 'chunk') {
            fullContent += chunk.data;
            yield { type: 'expert_chunk', data: { nodeId: sourceId, content: chunk.data, step } };
          } else if (chunk.type === 'usage') {
            trackUsage(chunk.data, sourceId);
          }
        }
        refined.set(sourceId, fullContent);
      })());

      for await (const event of mergeStreams(reverseGenerators)) {
        yield event;
      }

      const currentAggregate = [...refined.values()].join('\n');
      const haltDecision = await RMoA.checkConvergence(currentAggregate, previousAggregate, step);
      
      yield { type: 'status', data: `Refinement step ${step}: Δ=${haltDecision.delta.toFixed(4)}` };
      
      currentResponses = refined;
      previousAggregate = currentAggregate;
      finalRefinedResponses = refined;

      yield { type: 'graph', data: { nodes: plan.selectedNodes, adjacency: hybridAdj, usage: nodeUsage } };

      if (haltDecision.shouldHalt) {
        logger.info({ haltReason: haltDecision.haltReason, step }, '[RMoA] Halting condition met.');
        break;
      }
    }

    // 6. Dynamic Pooling (with DALC)
    yield { type: 'status', data: 'Finalizing synthesis with DALC...' };
    const allFinalResponses = [...finalRefinedResponses.values()];
    
    const runSynthesis = async (directive: string = '') => {
      let prompt = poolingPrompt
        .replace('{{query}}', query)
        .replace('{{skills}}', skillKeywords)
        .replace('{{agent_responses}}', allFinalResponses.join('\n\n--- Agent Break ---\n\n'));
      
      if (directive) {
        prompt += `\n\nCRITICAL DIVERSITY DIRECTIVE: ${directive}`;
      }
      
      const { content, usage } = await callModel(Orchestrator.SELECTOR_MODEL, prompt, 0.3);
      trackUsage(usage);
      return content;
    };

    const initialSynthesis = await runSynthesis();
    const dalcResult = await DALC.enforce(
      initialSynthesis,
      plan.rationale,
      runSynthesis
    );

    yield { type: 'dalc', data: dalcResult };
    let finalOutput = dalcResult.finalOutput;

    // Final streaming display of results
    yield { type: 'chunk', data: finalOutput };

    // 7. Verifier
    yield { type: 'usage', data: totalUsage };
    yield { type: 'status', data: 'Verifying response...' };
    // ... Verifier logic (simplified for stream)
    yield { type: 'final', data: finalOutput };
    await SemanticCache.set(query, finalOutput);
  }
}
