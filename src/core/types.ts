import { z } from 'zod';

/**
 * V2 Graph-of-Agents (GoA) Core Types
 * traces: FRD-FR-23, FRD-FR-27, GEMINI.md §3
 */

export const ModelCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.enum(['logic', 'extraction', 'generalist', 'coding']),
  description: z.string(),
  context_window: z.number(),
  active_params: z.string(),
  proficiencies: z.record(z.number())
});

export type ModelCard = z.infer<typeof ModelCardSchema>;

export const GraphPlanSchema = z.object({
  selectedNodes: z.array(z.string()),
  poolingMethod: z.enum(['max', 'mean']),
  rationale: z.string()
});

export type GraphPlan = z.infer<typeof GraphPlanSchema>;

export const AdjacencyMatrixSchema = z.array(z.array(z.number()));
export type AdjacencyMatrix = z.infer<typeof AdjacencyMatrixSchema>;

export const PartitionedNodesSchema = z.object({
  source: z.array(z.string()),
  target: z.array(z.string())
});

export type PartitionedNodes = z.infer<typeof PartitionedNodesSchema>;

export const GoAResultSchema = z.object({
  finalResponse: z.string(),
  graphDepth: z.number(),
  edgeWeights: AdjacencyMatrixSchema,
  partitions: PartitionedNodesSchema,
  tokenUsage: z.object({
    prompt: z.number(),
    completion: z.number(),
    total: z.number()
  })
});

export type GoAResult = z.infer<typeof GoAResultSchema>;
