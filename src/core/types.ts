/**
 * V2 Graph-of-Agents (GoA) Core Types
 * traces: FRD-FR-23, FRD-FR-27
 */

export interface ModelCard {
  id: string;
  name: string;
  domain: 'logic' | 'extraction' | 'generalist' | 'coding';
  description: string;
  context_window: number;
  active_params: string;
  proficiencies: Record<string, number>;
}

export interface GraphPlan {
  selectedNodes: string[];
  poolingMethod: 'max' | 'mean';
  rationale: string;
}

export type AdjacencyMatrix = number[][];

export interface PartitionedNodes {
  source: string[];
  target: string[];
}

export interface GoAResult {
  finalResponse: string;
  graphDepth: number;
  edgeWeights: AdjacencyMatrix;
  partitions: PartitionedNodes;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
}
