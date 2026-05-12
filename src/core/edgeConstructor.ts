import { ModelCard } from './types';

/**
 * edgeConstructor Service (V2 Migration Hook)
 * traces: ADR-007, PROJECT_STRUCTURE §V2 hooks
 */
export class EdgeConstructor {
  /**
   * Construct dynamic edges based on skill alignment between experts
   * traces: FRD-FR-26
   */
  public static constructSkillEdges(
    nodes: string[], 
    registry: ModelCard[], 
    querySkillVector: number[],
    taxonomyIds: string[]
  ): number[][] {
    const size = nodes.length;
    const matrix: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));

    for (let i = 0; i < size; i++) {
      const sourceAgent = registry.find(m => m.id === nodes[i]);
      if (!sourceAgent) continue;

      for (let j = 0; j < size; j++) {
        if (i === j) continue;
        const targetAgent = registry.find(m => m.id === nodes[j]);
        if (!targetAgent) continue;

        // Skill alignment score: (Source Prof @ Skill) * (Target Prof @ Skill) * (Query Requirement @ Skill)
        let alignment = 0;
        taxonomyIds.forEach((skillId, index) => {
          const req = querySkillVector[index] || 0;
          const sourceProf = sourceAgent.proficiencies[skillId] || 0;
          const targetProf = targetAgent.proficiencies[skillId] || 0;
          
          alignment += sourceProf * targetProf * req;
        });

        matrix[i][j] = Math.min(1, alignment);
      }
    }

    return matrix;
  }

  /**
   * Construct dynamic edges based on semantic relevance and constraints
   */
  public static constructEdges(nodes: string[], adjacency: number[][]): any {
    return adjacency;
  }
}
