# Release Notes: V2.0.0 (Graph-of-Agents Migration)

## Overview
V2.0.0 marks a foundational architectural shift from the legacy sequential MoA/MoE pipeline to a **Sparse, Bidirectional Graph-of-Agents (GoA)** model. This migration enables parallel expert execution and peer-to-peer refinement, significantly reducing latency and improving contextual grounding.

## Key Changes
- **Parallel Orchestration**: Replaced the Router-Proposer-Aggregator loop with a 6-step GoA pipeline.
- **GraphEngine**: Implemented dynamic subgraph extraction and centrality-based node partitioning (Source/Target).
- **Bidirectional Refinement**: Introduced Forward and Reverse message passing between expert nodes.
- **Observability**: Integrated token usage auditing and structured logging for all graph transitions.

## Efficiency Gains
- **Sparsity Enforcement**: $\tau = 0.05$ threshold prunes redundant edges, focusing computation on the most relevant expert clusters.
- **Concurrency**: Parallel node execution reduces E2E latency for complex reasoning tasks.

## Breaking Changes
- `DALC` and `RMoA` services are now encapsulated within the `GraphEngine` and `Orchestrator` flow rather than being invoked as standalone middleware.
