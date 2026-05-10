# Research: Phase 7 - V2 Graph-of-Agents (GoA) Migration

## Domain Overview
Graph-of-Agents (GoA) is a multi-agent framework where agents are nodes in a sparse, bidirectional graph. Unlike sequential MoA, GoA allows for peer-to-peer refinement and dynamic subgraph extraction.

## Meta-LLM Selection
- **Selector**: `inclusionai/ring-2.6-1t:free`
- **Objective**: Analyze the query and select $k=3$ most relevant expert models from the registry.
- **Output Format**: JSON `GraphPlan`.

## Expert Node Registry
Based on OpenRouter Free Tier:
1. `qwen/qwen3-next-80b-a3b-instruct:free` (Logic/Reasoning)
2. `qwen/qwen3-coder:free` (Extraction/Structuring/Coding)
3. `nvidia/nemotron-3-super-120b-a12b:free` (Generalist/Synthesis)
4. `inclusionai/ring-2.6-1t:free` (Selector/Generalist)


## Graph Topology Logic
### Adjacency Matrix
- Each node $i$ evaluates node $j$'s initial output.
- Score $S_{ij} \in [0, 1]$.
- Sparse threshold $\tau = 0.05$.
- If $S_{ij} < \tau$, edge is removed ($0$).

### Partitioning
- **Centrality**: Inbound score sum $\sum_{j} S_{ji}$.
- **Source Group**: Nodes with higher centrality (likely experts/correct).
- **Target Group**: Nodes with lower centrality (likely needing refinement).

## Bidirectional Message Passing
1. **Forward**: Source nodes send context to Target nodes. Target nodes produce "Refined" outputs.
2. **Reverse**: Target nodes send refined context back to Source nodes. Source nodes produce "Polished" outputs.

## Pooling Strategy
- **GoA-Max**: Meta-LLM picks the best output (for math/logic).
- **GoA-Mean**: Meta-LLM synthesizes a final response (for creative/analytical).

## Implementation Risks
- **Latency**: $k^2$ scoring calls can be slow. Mitigation: Parallelize using `Promise.all`.
- **Context Window**: Bidirectional passing increases context size. Mitigation: Structured prompt snippets.
- **Model Stability**: Free tier models may have high failure rates. Mitigation: Reuse V1 fallback chain.

## Verification Strategy
- **Success Metrics**: 60% token reduction (from fewer nodes than V1's 4-node loop + reduced synthesis complexity).
- **Regression**: 100% pass on Golden Fixture Set.
