# V2 Graph-of-Agents (GoA) Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the sequential MoA pipeline into a sparse, bidirectional graph orchestration for increased efficiency and accuracy.

**Architecture:** Implements the ICLR 2026 GoA framework with a task-specific sampling budget ($k=3$), peer-to-peer relevance scoring, and dynamic pooling (Max/Mean).

**Tech Stack:** TypeScript, OpenRouter (`inclusionai/ring-2.6-1t:free`, `qwen3`, `owl-alpha`), PostgreSQL, Pino.

---

### Task 1: Agent Registry & Schema
**Files:**
- Create: `src/prompts/agent-registry.json`
- Create: `src/core/types.ts`

- [ ] **Step 1: Define V2 Graph Types**
```typescript
export interface ModelCard {
  id: string;
  name: string;
  domain: 'logic' | 'extraction' | 'generalist' | 'coding';
  description: string;
  context_window: number;
  active_params: string;
}

export interface GraphPlan {
  selectedNodes: string[];
  poolingMethod: 'max' | 'mean';
  rationale: string;
}
```
- [ ] **Step 2: Create Agent Registry**
Create `src/prompts/agent-registry.json` with cards for:
1. `inclusionai/ring-2.6-1t:free` (Selector)
2. `qwen/qwen3-235b-a22b:free` (Logic)
3. `openrouter/owl-alpha` (Extraction)
4. `nvidia/nemotron-3-super-120b-a12b:free` (Generalist)
- [ ] **Step 3: Commit**
```bash
git add src/core/types.ts src/prompts/agent-registry.json
git commit -m "feat: add agent registry and graph types"
```

### Task 2: GraphEngine Service
**Files:**
- Create: `src/services/GraphEngine.ts`
- Test: `tests/unit/GraphEngine.test.ts`

- [ ] **Step 1: Implement Adjacency Computation**
```typescript
public static computeAdjacency(scores: Map<string, Map<string, number>>): number[][] {
  const threshold = 0.05;
  // Matrix logic...
}
```
- [ ] **Step 2: Implement Source/Target Partitioning**
```typescript
public static partitionNodes(adj: number[][]): { source: string[], target: string[] } {
  // Centrality logic...
}
```
- [ ] **Step 3: Write Unit Test**
Verify that a node with the highest inbound relevance is correctly assigned to the Source group.
- [ ] **Step 4: Commit**
```bash
git add src/services/GraphEngine.ts
git commit -m "feat: implement GraphEngine adjacency and partitioning"
```

### Task 3: Orchestrator Refactor (Node Sampling)
**Files:**
- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Implement Meta-LLM Selection**
Update `Orchestrator.execute` to call `inclusionai/ring-2.6-1t:free` with the registry to get a `GraphPlan`.
- [ ] **Step 2: Implement Peer-to-Peer Scoring**
Execute $k \times (k-1)$ relevance evaluation calls in parallel.
- [ ] **Step 3: Commit**
```bash
git commit -m "feat: refactor orchestrator for GoA node sampling"
```

### Task 4: Bidirectional Message Passing & Pooling
**Files:**
- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Implement Forward Pass (Source -> Target)**
Refine Target nodes using Source outputs as context.
- [ ] **Step 2: Implement Reverse Pass (Target -> Source)**
Polishing Source nodes using Refined Target outputs.
- [ ] **Step 3: Implement Dynamic Pooling**
Execute `GoA-Max` (select best) or `GoA-Mean` (synthesize) based on the `GraphPlan`.
- [ ] **Step 4: Verify with Golden Fixture**
Run `npm test -- --grep "golden"` and verify 100% pass rate.
- [ ] **Step 5: Commit**
```bash
git commit -m "feat: complete GoA bidirectional passing and pooling"
```
