import { describe, it, expect } from 'vitest';
import { GraphEngine } from '../../src/services/GraphEngine';
import { AdjacencyMatrix } from '../../src/core/types';

describe('GraphEngine', () => {
  const nodes = ['node1', 'node2', 'node3'];

  describe('computeAdjacency', () => {
    it('should compute adjacency matrix and apply threshold', () => {
      const scores = new Map<string, Map<string, number>>();
      
      const node1Scores = new Map<string, number>();
      node1Scores.set('node2', 0.8);
      node1Scores.set('node3', 0.02); // Below threshold
      scores.set('node1', node1Scores);

      const node2Scores = new Map<string, number>();
      node2Scores.set('node1', 0.5);
      node2Scores.set('node3', 0.9);
      scores.set('node2', node2Scores);

      const adj = GraphEngine.computeAdjacency(nodes, scores);

      expect(adj[0][1]).toBe(0.8);
      expect(adj[0][2]).toBe(0); // Pruned
      expect(adj[1][0]).toBe(0.5);
      expect(adj[1][2]).toBe(0.9);
      expect(adj[0][0]).toBe(0); // No self-loops
    });
  });

  describe('partitionNodes', () => {
    it('should correctly partition nodes based on centrality', () => {
      // node1 is highly relevant to node2 and node3
      // node2 and node3 are only relevant to each other
      const adj: AdjacencyMatrix = [
        [0, 0.8, 0.9], // node1 -> node2, node3
        [0.1, 0, 0.2], // node2 -> node1, node3
        [0.1, 0.2, 0], // node3 -> node1, node2
      ];

      // Inbound scores:
      // node1: 0.1 + 0.1 = 0.2
      // node2: 0.8 + 0.2 = 1.0
      // node3: 0.9 + 0.2 = 1.1

      // Centrality ranking: node3 (1.1) > node2 (1.0) > node1 (0.2)
      // k=3, splitIndex = ceil(3/2) = 2
      // Source: node3, node2
      // Target: node1

      const { source, target } = GraphEngine.partitionNodes(nodes, adj);

      expect(source).toContain('node3');
      expect(source).toContain('node2');
      expect(target).toContain('node1');
    });
  });

  describe('getSparsity', () => {
    it('should calculate sparsity correctly', () => {
      const adj: AdjacencyMatrix = [
        [0, 0.8, 0],
        [0.5, 0, 0],
        [0, 0, 0],
      ];
      // 2 active edges / 6 possible edges = 0.333...
      expect(GraphEngine.getSparsity(adj)).toBeCloseTo(0.333, 3);
    });

    it('should return 1 for empty nodes list (no edges possible)', () => {
      expect(GraphEngine.getSparsity([])).toBe(1);
    });
  });
});
