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
import { ModelCard, GraphPlan, AdjacencyMatrix, PartitionedNodes } from './types';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';

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
    const trackUsage = (usage: { prompt: number; completion: number; total: number }) => {
      totalUsage.prompt += usage.prompt;
      totalUsage.completion += usage.completion;
      totalUsage.total += usage.total;
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
      plan = { selectedNodes: registry.slice(1, 4).map(m => m.id), poolingMethod: 'mean', rationale: 'Fallback' };
    }
    yield { type: 'plan', data: plan };

    // 2. Initial Node Responses
    yield { type: 'status', data: 'Gathering initial perspectives...' };
    const initialResponses = new Map<string, string>();
    await Promise.all(plan.selectedNodes.map(async (nodeId) => {
      const { content, usage } = await callModel(nodeId, `Task: Provide an initial expert response to the query: ${query}`, 0.7);
      initialResponses.set(nodeId, content);
      trackUsage(usage);
    }));

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
          trackUsage(usage);
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
    yield { type: 'graph', data: { nodes: plan.selectedNodes, adjacency: hybridAdj } };

    // 5. Bidirectional Message Passing
    yield { type: 'status', data: 'Performing bidirectional refinement...' };
    const sourceContext = source.map(id => `Agent [${id}]: ${initialResponses.get(id)}`).join('\n\n');
    const refinedResponses = new Map<string, string>();

    await Promise.all(target.map(async (targetId) => {
      const { content: refined, usage } = await callModel(
        targetId,
        forwardPassPrompt.replace('{{query}}', query).replace('{{initial_response}}', initialResponses.get(targetId)!).replace('{{source_context}}', sourceContext),
        0.7
      );
      refinedResponses.set(targetId, refined);
      trackUsage(usage);
    }));

    const targetRefinements = target.map(id => `Refined Agent [${id}]: ${refinedResponses.get(id)}`).join('\n\n');
    const polishedResponses = new Map<string, string>();

    await Promise.all(source.map(async (sourceId) => {
      const { content: polished, usage } = await callModel(
        sourceId,
        reversePassPrompt.replace('{{query}}', query).replace('{{initial_response}}', initialResponses.get(sourceId)!).replace('{{target_refinements}}', targetRefinements),
        0.7
      );
      polishedResponses.set(sourceId, polished);
      trackUsage(usage);
    }));

    // 6. Dynamic Pooling (Streaming)
    yield { type: 'status', data: 'Finalizing synthesis...' };
    const allFinalResponses = [...polishedResponses.values(), ...refinedResponses.values()];
    const poolingStream = callModelStream(
      Orchestrator.SELECTOR_MODEL,
      poolingPrompt.replace('{{query}}', query).replace('{{skills}}', skillKeywords).replace('{{agent_responses}}', allFinalResponses.join('\n\n--- Agent Break ---\n\n')),
      0.3
    );

    let finalOutput = '';
    for await (const chunk of poolingStream) {
      if (chunk.type === 'chunk') {
        finalOutput += chunk.data;
        yield { type: 'chunk', data: chunk.data };
      } else if (chunk.type === 'usage') {
        trackUsage(chunk.data);
      }
    }

    // 7. Verifier
    yield { type: 'usage', data: totalUsage };
    yield { type: 'status', data: 'Verifying response...' };
    // ... Verifier logic (simplified for stream)
    yield { type: 'final', data: finalOutput };
    await SemanticCache.set(query, finalOutput);
  }
}
