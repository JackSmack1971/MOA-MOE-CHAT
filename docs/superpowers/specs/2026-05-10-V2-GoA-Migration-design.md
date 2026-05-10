# Specification: V2 Graph-of-Agents (GoA) Migration

**Date**: 2026-05-10  
**Status**: DRAFT  
**Scope**: Migration of the MoA/MoE framework from a sequential loop to a sparse, bidirectional graph orchestration (GoA).

## 1. Executive Summary
The V2 migration evolves the sequential MoA pipeline (Router -> Proposer -> DALC -> Aggregator) into a sparse, dynamic Graph-of-Agents (GoA) architecture based on the ICLR 2026 framework. By utilizing a task-specific sampling budget ($k=3$) and relevance-aware bidirectional message passing, V2 targets a 60% reduction in token consumption while improving reasoning accuracy.

## 2. Technical Architecture

### 2.1 Subgraph Extraction (Node Sampling)
- **Selector**: `inclusionai/ring-2.6-1t:free` (Meta-LLM).
- **Registry**: `src/prompts/agent-registry.json` containing static model cards for the OpenRouter free tier.
- **Process**: Upon query, the Meta-LLM selects exactly $k=3$ nodes.
- **Primary Contenders**:
    - **Logic**: `qwen/qwen3-235b-a22b:free`
    - **Extraction**: `openrouter/owl-alpha`
    - **Generalist**: `nvidia/nemotron-3-super-120b-a12b:free`

### 2.2 Adjacency Matrix & Partitioning
- **Edge Construction**: Peer-to-peer relevance scoring where each node evaluates the initial responses of others.
- **Threshold**: $\tau = 0.05$ (Hard thresholding to enforce sparsity).
- **Centrality Ranking**: Nodes partitioned into **Source** (Experts) and **Target** (Refiners) groups based on total inbound relevance scores.

### 2.3 Bidirectional Message Passing
- **Phase 1 (Forward)**: Source nodes pass context to Target nodes for refinement.
- **Phase 2 (Reverse)**: Target nodes pass polished results back to Source nodes for final edge-case verification.

### 2.4 Dynamic Graph Pooling
- **GoA-Max**: For fact-oriented/binary queries; Meta-LLM selects the single highest-ranked node output.
- **GoA-Mean**: For analytical/creative queries; Meta-LLM synthesizes a unified response from all refined nodes.

## 3. Component Updates

### 3.1 `src/services/GraphEngine.ts` [NEW]
Core logic for adjacency matrix computation, partitioning, and temporal phase orchestration.

### 3.2 `src/core/orchestrator.ts` [MODIFY]
Refactored to delegate to `GraphEngine`. Maintains the `AgentNode` interface for V2 compatibility.

### 3.3 `src/prompts/agent-registry.json` [NEW]
Static JSON metadata for the Meta-LLM selection prompt.

## 4. Resilience & Persistence
- **Fallback Layer**: Maintains V1 fallback chain (exponential backoff) for each graph node.
- **Semantic Cache**: V2 graph results are cached via `pgvector` as in V1.
- **Telemetry**: Pino structured logging updated to track `graph_depth`, `edge_weights`, and `partition_groups`.

## 5. Verification Plan
- **Golden Regression**: 100% pass requirement on the 20-prompt fixture set.
- **Efficiency Audit**: Comparison of token consumption vs V1 (Target: ≥ 50% reduction).
- **Diversity Check**: Verification that DALC thresholds remain compliant within the graph topology.

---
// traces: FRD-FR-01, ADR-001, ADR-007
