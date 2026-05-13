import { callModel, callModelStream } from './callModel';
import { DALC } from '../services/DALC';
import { RMoA } from '../services/RMoA';
import { Verifier, VerifierVerdict } from '../services/Verifier';
import { EmbeddingService } from '../services/EmbeddingService';
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
  let error: any = null;

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
    } catch (err) {
      logger.error({ err }, '[mergeStreams] Generator error');
      error = err;
      if (resolve) {
        resolve(null);
        resolve = null;
      }
    } finally {
      active--;
      if (active === 0) {
        if (resolve) {
          resolve(null);
          resolve = null;
        } else {
          queue.push(null);
        }
      }
    }
  });

  while (true) {
    if (error) throw error;
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
 * Concurrency-limited promise pool helper
 */
async function batchMap<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += limit) {
    batches.push(items.slice(i, i + limit));
  }
  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Orchestrator Service (V3 Symbolic-MoE)
 * traces: FR-23, FR-24, FR-25, FR-26, FR-27, ADR-001, ADR-007
 */
export class Orchestrator {
  private static readonly SELECTOR_MODEL = 'inclusionai/ring-2.6-1t:free';
  private static readonly CHEAP_MODEL = 'google/gemma-2-9b-it:free';
  private static readonly PREMIUM_MODEL = 'openai/gpt-4o-mini'; // Or similar premium model via models.md
  private static readonly REGISTRY_PATH = path.join(__dirname, '../prompts/agent-registry.json');
  private static readonly SKILL_TAXONOMY_PATH = path.join(__dirname, '../prompts/skill-registry.json');

  /**
   * Simple context compression helper to truncate very long expert responses
   * before feeding them into refinement loops or synthesis.
   */
  private compressContext(text: string, maxLength: number = 2000): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength / 2) + '\n\n[... content truncated for token efficiency ...]\n\n' + text.substring(text.length - maxLength / 2);
  }

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

    // -1. Query Complexity Analysis (Heuristic)
    const queryComplexityScore = Math.min(3.3, (query.length / 200) + (query.split(' ').length / 50));
    const dynamicMaxSteps = Math.min(10, Math.ceil(queryComplexityScore * 3));
    logger.info({ queryComplexityScore, dynamicMaxSteps }, '[Orchestrator] Complexity analysis complete');
    
    const embeddingService = EmbeddingService.getInstance();
    embeddingService.clearCache(); // Start fresh for this query
    RMoA.resetBuffer();

    // 0. Semantic Cache Lookup
    yield { type: 'status', data: 'Performing cache lookup...' };
    logger.info({ query }, '[Orchestrator] Starting query execution');
    const cachedResponse = await SemanticCache.get(query);
    if (cachedResponse) {
      yield { type: 'chunk', data: cachedResponse };
      yield { type: 'status', data: 'Cache HIT' };
      return;
    }

    // 0.5. Skill Extraction
    yield { type: 'status', data: 'Extracting skills...' };
    logger.info('[Orchestrator] Extracting skills');
    const taxonomy = JSON.parse(fs.readFileSync(Orchestrator.SKILL_TAXONOMY_PATH, 'utf-8'));
    // Use CHEAP_MODEL for skill extraction
    const { content: skillKeywords, usage: skillUsage } = await callModel(
      Orchestrator.CHEAP_MODEL,
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
    logger.info('[Orchestrator] Selecting experts');
    const rawRegistry = JSON.parse(fs.readFileSync(Orchestrator.REGISTRY_PATH, 'utf-8'));
    const registry: ModelCard[] = rawRegistry.map((m: any) => ModelCardSchema.parse(m));
    // Use CHEAP_MODEL for expert selection if complexity is low
    const selectionModel = queryComplexityScore < 1.0 ? Orchestrator.CHEAP_MODEL : Orchestrator.SELECTOR_MODEL;
    const { content: selectorResponse, usage: selectorUsage } = await callModel(
      selectionModel,
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

    // 2.5 Early Exit for trivial queries
    if (queryComplexityScore < 0.2) {
      logger.info('[Orchestrator] Low complexity detected. Skipping refinement.');
      // Map experts to final output format and exit
      const quickSynthesis = [...initialResponses.values()].join('\n\n---\n\n');
      yield { type: 'final', data: quickSynthesis };
      await SemanticCache.set(query, quickSynthesis);
      return;
    }

    // 3. Peer-to-Peer Relevance Scoring
    yield { type: 'status', data: 'Building adjacency graph (Hybrid)...' };
    const scores = new Map<string, Map<string, number>>();
    const scoringTasks: Promise<void>[] = [];

    // Pre-calculate embeddings for initial responses
    const initialEmbeddings = new Map<string, number[]>();
    for (const [nodeId, response] of initialResponses.entries()) {
      initialEmbeddings.set(nodeId, await embeddingService.embed(response));
    }

    for (const sourceId of plan.selectedNodes) {
      for (const targetId of plan.selectedNodes) {
        if (sourceId === targetId) continue;
        scoringTasks.push((async () => {
          const sourceEmbed = initialEmbeddings.get(sourceId);
          const targetEmbed = initialEmbeddings.get(targetId);
          
          let score: number;
          const similarity = (sourceEmbed && targetEmbed) 
            ? EmbeddingService.cosineSimilarity(sourceEmbed, targetEmbed) 
            : 0;

          const threshold = parseFloat(process.env.RELEVANCE_EMBEDDING_THRESHOLD || '0.7');
          const lowThreshold = 0.3; // Pruning threshold

          // Vector-Index Logic: Prune irrelevant edges entirely
          if (similarity < lowThreshold) {
            score = 0;
            logger.debug({ sourceId, targetId, similarity }, '[Orchestrator] Pruning irrelevant edge');
          }
          // Hybrid Filter: If similarity is high, use embedding score
          else if (similarity > threshold) {
            score = similarity;
            logger.debug({ sourceId, targetId, similarity }, '[Orchestrator] Using embedding similarity (High overlap)');
          } else {
            const { content: scoreStr, usage } = await callModel(
              Orchestrator.CHEAP_MODEL, // Use CHEAP_MODEL for scoring checks
              relevanceScoringPrompt.replace('{{query}}', query).replace('{{target_output}}', initialResponses.get(targetId)!),
              0.1
            );
            trackUsage(usage, sourceId);
            score = parseFloat(scoreStr) || 0;
            logger.debug({ sourceId, targetId, similarity, llmScore: score }, '[Orchestrator] Using LLM for nuanced scoring');
          }

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

    for (let step = 1; step <= dynamicMaxSteps; step++) {
      // Compress context for source agents
      const sourceContext = source.map(id => `Agent [${id}]: ${this.compressContext(currentResponses.get(id) || '')}`).join('\n\n');
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

      // Early Exit Classifier: If first step is near-perfect convergence, skip remaining steps
      const firstStepAggregate = [...refined.values()].join('\n');
      const firstStepHalt = await RMoA.checkConvergence(firstStepAggregate, previousAggregate, step, dynamicMaxSteps);
      if (step === 1 && firstStepHalt.delta < 0.015) {
        logger.info({ delta: firstStepHalt.delta }, '[RMoA] High-confidence convergence after step 1. Early exiting.');
        finalRefinedResponses = refined;
        break;
      }

      // Reverse Pass
      // Compress target refinements for reverse pass
      const targetRefinements = target.map(id => `Refined Agent [${id}]: ${this.compressContext(refined.get(id) || '')}`).join('\n\n');
      // Use batching for reverse pass with concurrency 3
      const reversePassTasks: (() => AsyncGenerator<any>)[] = [];
      for (const sourceId of source) {
        reversePassTasks.push(() => (async function* () {
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
      }

      // Execute batches of 3
      const CONCURRENCY_LIMIT = 3;
      for (let i = 0; i < reversePassTasks.length; i += CONCURRENCY_LIMIT) {
        const batch = reversePassTasks.slice(i, i + CONCURRENCY_LIMIT).map(t => t());
        for await (const event of mergeStreams(batch)) {
          yield event;
        }
      }

      const currentAggregate = [...refined.values()].join('\n');
      const haltDecision = await RMoA.checkConvergence(currentAggregate, previousAggregate, step, dynamicMaxSteps);
      
      logger.info({ step, delta: haltDecision.delta, dynamicMaxSteps }, `[RMoA] Refinement progress: step ${step}/${dynamicMaxSteps}`);
      yield { type: 'status', data: `Refinement step ${step}: Δ=${haltDecision.delta.toFixed(4)}` };
      
      currentResponses = refined;
      previousAggregate = currentAggregate;
      finalRefinedResponses = refined;

      yield { type: 'graph', data: { nodes: plan.selectedNodes, adjacency: hybridAdj, usage: nodeUsage } };

      if (haltDecision.shouldHalt) {
        logger.info({ haltReason: haltDecision.haltReason, step, totalSteps: dynamicMaxSteps }, '[RMoA] Halting condition met.');
        yield { type: 'status', data: `Refinement HALTED at step ${step}: ${haltDecision.haltReason}` };
        break;
      }
    }

    // 6. Dynamic Pooling (with DALC)
    yield { type: 'status', data: 'Finalizing synthesis with DALC...' };
    const allFinalResponses = [...finalRefinedResponses.values()];
    const planEmbedding = await embeddingService.embed(plan.rationale);

    // Predicted Collapse Optimization:
    // If experts already collapse with the plan, skip the "clean" first synthesis.
    const finalEmbeddings = await Promise.all(
      allFinalResponses.map(resp => embeddingService.embed(resp))
    );
    const predictedCollapse = DALC.predictCollapse(finalEmbeddings, planEmbedding);
    
    const runSynthesis = async (directive: string = '') => {
      let prompt = poolingPrompt
        .replace('{{query}}', query)
        .replace('{{skills}}', skillKeywords)
        .replace('{{agent_responses}}', allFinalResponses.join('\n\n--- Agent Break ---\n\n'));
      
      if (directive) {
        prompt += `\n\nCRITICAL DIVERSITY DIRECTIVE: ${directive}`;
      }
      
      // Use PREMIUM_MODEL for final synthesis if complexity is high
      const synthesisModel = queryComplexityScore > 2.0 ? Orchestrator.PREMIUM_MODEL : Orchestrator.SELECTOR_MODEL;
      const { content, usage } = await callModel(synthesisModel, prompt, 0.3);
      trackUsage(usage);
      return content;
    };

    let initialSynthesis: string;
    let initialStatus: DALCResult['status'] = 'PASS';
    
    if (predictedCollapse) {
      logger.info('[Orchestrator] Predicted collapse detected. Jumping to diversity-aware synthesis.');
      initialSynthesis = await runSynthesis(DALC.ORTHOGONALITY_DIRECTIVE);
      initialStatus = 'PREDICTED_COLLAPSE_AVOIDED';
    } else {
      initialSynthesis = await runSynthesis();
    }

    const dalcResult = await DALC.enforce(
      initialSynthesis,
      plan.rationale,
      runSynthesis,
      planEmbedding
    );
    
    if (initialStatus === 'PREDICTED_COLLAPSE_AVOIDED' && dalcResult.status === 'PASS') {
      dalcResult.status = 'PREDICTED_COLLAPSE_AVOIDED';
    }

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
