# Research: Phase 8 - V3 Symbolic-MoE Prototype

## Domain Overview
Symbolic Mixture-of-Experts (Symbolic-MoE) is an evolution of the Graph-of-Agents architecture that replaces heuristic node sampling with **Adaptive Skill-based Routing**. It utilizes a symbolic intermediate layer (Skill Vectors) to match query requirements with expert capabilities.

## Key Components

### 1. Skill Taxonomy (Symbolic Layer)
Instead of generic domains (logic, extraction), V3 introduces a fine-grained skill taxonomy:
- `algebra_reasoning`, `js_runtime_expert`, `pii_redaction_logic`, `semantic_synthesis`, etc.
- These skills are serialized via the `SymbolicSerializer`.

### 2. Skill-Aware Recruiting
- **Keyword LLM**: A dedicated pass to extract "Skill Requirements" from the query.
- **Model Profiles**: Every agent in `agent-registry.json` is tagged with skill proficiency scores [0-1].

### 3. Dynamic Edge Construction
- Edges in the graph are not just relevance-based but **Skill-Alignment** based.
- If Node A (Skill: Extraction) leads to Node B (Skill: Synthesis), the edge weight is boosted if the query requires both in that sequence.

## Implementation Hooks (V2 Remnants)
- `src/services/SymbolicSerializer.ts`: Currently a JSON stub. Needs to support Skill-Vector math.
- `src/core/edgeConstructor.ts`: Currently a pass-through. Needs to implement Skill-Alignment weighting.

## Proposed V3 Architecture (Initiation)
1. **Extraction**: Query → [Meta-LLM] → Skill Vector (Symbolic).
2. **Matching**: Skill Vector + Model Profiles → [EdgeConstructor] → Dynamic Adjacency Matrix.
3. **Execution**: Bidirectional GoA pass (from V2) using the Skill-Optimized graph.

## Verification Goals
- **Accuracy**: Improve MMLU-style logic pass rates by ≥ 8%.
- **Efficiency**: Maintain token reduction achieved in V2.
