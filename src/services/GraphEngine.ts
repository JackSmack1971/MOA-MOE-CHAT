import { logger } from '../core/logger';
import { AdjacencyMatrix, PartitionedNodes } from '../core/types';

/**
 * GraphEngine Service
 * traces: FR-24, FR-25, FR-26
 * Implements core graph logic for GoA: adjacency computation and node partitioning.
 */
export class GraphEngine {
  private static readonly SPARSITY_THRESHOLD = 0.05; // τ = 0.05 per ICLR 2026 framework

  /**
   * Compute adjacency matrix from peer-to-peer relevance scores.
   * Applies sparsity threshold to prune weak edges.
   * @param nodes Ordered list of node IDs (k=3)
   * @param scores Map of source -> (target -> relevance_score)
   */
  public static computeAdjacency(
    nodes: string[],
    scores: Map<string, Map<string, number>>
  ): AdjacencyMatrix {
    const k = nodes.length;
    const matrix: AdjacencyMatrix = Array.from({ length: k }, () => Array(k).fill(0));

    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        if (i === j) continue; // No self-loops in GoA logic

        const sourceId = nodes[i];
        const targetId = nodes[j];
        const score = scores.get(sourceId)?.get(targetId) || 0;

        // Apply sparsity threshold
        matrix[i][j] = score >= this.SPARSITY_THRESHOLD ? score : 0;
      }
    }

    logger.debug({ sparsity: this.getSparsity(matrix) }, '[GraphEngine] Adjacency matrix computed');
    return matrix;
  }

  /**
   * Partition nodes into Source (Experts) and Target (Refiners) groups.
   * Uses centrality ranking (sum of inbound relevance scores).
   * @param nodes Ordered list of node IDs
   * @param adj Adjacency matrix
   */
  public static partitionNodes(nodes: string[], adj: AdjacencyMatrix): PartitionedNodes {
    const k = nodes.length;
    const inboundScores = Array(k).fill(0);

    // Compute inbound centrality scores
    for (let j = 0; j < k; j++) {
      for (let i = 0; i < k; i++) {
        inboundScores[j] += adj[i][j];
      }
    }

    // Sort nodes by centrality (descending)
    const indexedScores = inboundScores.map((score, index) => ({ index, score }));
    indexedScores.sort((a, b) => b.score - a.score);

    // Partition: Highest centrality node is Source, others are Target
    // Per ICLR 2026, Source nodes provide context, Target nodes refine.
    // In k=3, typically 1-2 Source, 1-2 Target. 
    // We'll use a simple split: Top N/2 (rounded up) as Source.
    const splitIndex = Math.ceil(k / 2);
    
    const source: string[] = [];
    const target: string[] = [];

    for (let i = 0; i < k; i++) {
      const nodeIndex = indexedScores[i].index;
      if (i < splitIndex) {
        source.push(nodes[nodeIndex]);
      } else {
        target.push(nodes[nodeIndex]);
      }
    }

    logger.info({ source, target }, '[GraphEngine] Nodes partitioned');
    return { source, target };
  }

  /**
   * Calculate sparsity of the adjacency matrix.
   * @param adj Adjacency matrix
   */
  public static getSparsity(adj: AdjacencyMatrix): number {
    const totalPossibleEdges = adj.length * (adj.length - 1);
    if (totalPossibleEdges === 0) return 1;

    let activeEdges = 0;
    for (let i = 0; i < adj.length; i++) {
      for (let j = 0; j < adj.length; j++) {
        if (adj[i][j] > 0) activeEdges++;
      }
    }

    return activeEdges / totalPossibleEdges;
  }
}
