# Plan: Phase 7 - V2 Graph-of-Agents (GoA) Migration

## Phase Goal
Evolve the MoA/MoE framework into a sparse, bidirectional Graph-of-Agents orchestration for efficiency and accuracy.

## User Review Required
> [!IMPORTANT]
> This phase refactors `src/core/orchestrator.ts` to delegate graph logic to a new `GraphEngine`. The `AgentNode` interface remains immutable to preserve the V1/V2 contract.

## Proposed Changes

### Task 1: Agent Registry & Schema
- **[NEW] [types.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/core/types.ts)**: Define `ModelCard`, `GraphPlan`, `AdjacencyMatrix`, and `GoAPooling` types.
- **[NEW] [agent-registry.json](file:///c:/workspaces/MOA-MOE-CHAT/src/prompts/agent-registry.json)**: Static metadata for Meta-LLM selection.

### Task 2: GraphEngine Service
- **[NEW] [GraphEngine.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/services/GraphEngine.ts)**:
    - `computeAdjacency(scores: Map<string, Map<string, number>>): number[][]`
    - `partitionNodes(adj: number[][]): { source: string[], target: string[] }`
    - `getSparsity(adj: number[][]): number`
- **[NEW] [GraphEngine.test.ts](file:///c:/workspaces/MOA-MOE-CHAT/tests/unit/GraphEngine.test.ts)**: Unit tests for matrix logic.

### Task 3: Orchestrator Refactor (Node Sampling)
- **[MODIFY] [orchestrator.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/core/orchestrator.ts)**:
    - Integrate `inclusionai/ring-2.6-1t:free` for subgraph extraction.
    - Implement peer-to-peer relevance scoring loop ($k=3$).
    - Update `execute` flow to branch into GoA logic.

### Task 4: Bidirectional Message Passing & Pooling
- **[MODIFY] [orchestrator.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/core/orchestrator.ts)**:
    - Implement Forward Pass (Source -> Target).
    - Implement Reverse Pass (Target -> Source).
    - Implement `GoA-Max` and `GoA-Mean` pooling via Meta-LLM.

### Task 5: V2 Validation
- **[MODIFY] [golden-fixture.regression.ts](file:///c:/workspaces/MOA-MOE-CHAT/tests/e2e/golden-fixture.regression.ts)**: Update to track token efficiency metrics.
- Run full regression suite.

## Verification Plan

### Automated Tests
- `npm test tests/unit/GraphEngine.test.ts`
- `npm test -- --grep "golden"` (Regression Gate)

### Manual Verification
- Inspect Pino logs for `graph_depth`, `edge_weights`, and `partition_groups`.
- Verify token reduction in OpenRouter dashboard or local telemetry.
