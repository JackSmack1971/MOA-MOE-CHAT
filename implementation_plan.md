# MOA-MOE-CHAT Efficiency Refactor

This plan implements the efficiency gains and refinements outlined in the "AGENTIC ORACLE" diagnosis to reduce token waste and latency while preserving quality.

## User Review Required

> [!IMPORTANT]
> The `queryComplexityScore` will be calculated using a heuristic (length + keyword density) to avoid an extra LLM call.
> The relevance scoring threshold for pre-filtering will be set to `0.7` by default.

## Proposed Changes

### [Core Orchestrator]

#### [MODIFY] [orchestrator.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/core/orchestrator.ts)
- Calculate `queryComplexityScore` at the start of `executeStreaming`.
- Implement Hybrid Relevance Scoring in Phase 3:
  - Generate embeddings for all initial expert responses.
  - Compute pairwise cosine similarity.
  - Only call LLM for relevance scoring if `similarity > THRESHOLD` (indicating significant overlap/conflict) or `similarity < LOW_THRESHOLD` (indicating potential irrelevance).
- Update Phase 5 (Refinement Loop):
  - Replace hardcoded `10` steps with `Math.min(10, Math.ceil(queryComplexityScore * 3))`.
  - Pass history to `RMoA.checkConvergence` for the Reflexion buffer.
- **V2 Efficiency Gains**:
  - Implement Model-Tier Routing (`CHEAP_MODEL` vs `PREMIUM_MODEL`).
  - Implement `compressContext` for token-efficient bidirectional loops.
  - Implement Early-Exit heuristic for trivial queries (`complexity < 0.2`).

### [Services]

#### [MODIFY] [RMoA.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/services/RMoA.ts)
- Add a `reflexionBuffer` to track convergence history.
- Implement dynamic EPSILON adjustment if convergence is slow but steady.

#### [MODIFY] [DALC.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/services/DALC.ts)
- Optimize the `enforce` method to minimize redundant embedding calls.
- Implement `predictCollapse` centroid check before synthesis.

#### [MODIFY] [EmbeddingService.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/services/EmbeddingService.ts)
- Implement internal `vectorCache` with SHA-256 hashing to eliminate redundant calculations.

## Verification Plan

### Automated Tests
- `npm test` to ensure no regressions in the core pipeline.
- `npm test -- --grep "golden"` to verify compliance with mandatory benchmarks.
- Custom script `scratch/test_efficiency.ts` to measure token usage before and after changes.

### Manual Verification
- Run a set of simple vs. complex queries and observe the number of refinement steps in the logs.
- Verify that Phase 3 (Scoring) performs fewer LLM calls for diverse expert outputs.
