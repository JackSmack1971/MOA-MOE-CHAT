# Expert Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce perceived TTFT by streaming intermediate expert perspectives as they arrive.

**Architecture:** Refactor Orchestrator parallel loops to use a merged async generator pattern for interleaved expert tokens. The UI will toggle Quadrant 2 to show a grid of streaming terminals.

**Tech Stack:** Svelte 5, Express SSE, Async Generators, OpenRouter Streaming.

---

### Task 1: Backend Infrastructure (Parallel Streaming)

**Files:**
- Modify: `src/core/callModel.ts`
- Modify: `src/core/orchestrator.ts`
- Test: `tests/unit/Orchestrator.stream.test.ts`

- [ ] **Step 1: Standardize `usage` in `callModelStream`**
Modify `src/core/callModel.ts` to ensure `usage` data is returned in the consistent `{ prompt, completion, total }` format used by the non-streaming `callModel`.

- [ ] **Step 2: Implement `mergeStreams` utility in `Orchestrator.ts`**
Add the `mergeStreams` helper function to `src/core/orchestrator.ts` to interleave events from multiple expert generators.

- [ ] **Step 3: Refactor Initial Responses to stream**
Update the initial response loop in `executeStreaming` to use `callModelStream` and yield `expert_chunk` events through `mergeStreams`.

- [ ] **Step 4: Refactor Refinement Loops to stream**
Update the 1-10 refinement cycle to yield expert tokens in real-time.

- [ ] **Step 5: Add unit test for parallel yielding**
Create `tests/unit/Orchestrator.stream.test.ts` and verify that `expert_chunk` events are emitted during the pipeline.

### Task 2: Frontend UI (Expert Workbench)

**Files:**
- Create: `src/ui/src/ExpertWorkbench.svelte`
- Modify: `src/ui/src/App.svelte`

- [ ] **Step 1: Implement `ExpertWorkbench.svelte`**
Build a grid-based component that renders multiple terminal windows with Cyber-Brutalist styling.

- [ ] **Step 2: State management in `App.svelte`**
Add `expertStreams` reactive state to `App.svelte` and logic to clear it at the start of each query.

- [ ] **Step 3: SSE Handler Update**
Update the event listener in `App.svelte` to process `expert_chunk` and append content to the correct node buffer.

- [ ] **Step 4: Quadrant 2 Switching**
Modify the layout in `App.svelte` to show `ExpertWorkbench` when `status !== 'IDLE'` and `SystemTelemetry` otherwise.

### Task 3: Visual Polish & Cleanup

**Files:**
- Modify: `src/ui/src/Graph.svelte`
- Modify: `src/ui/src/App.svelte`

- [ ] **Step 1: "LIVE" Node Indicators**
Update `Graph.svelte` to show a small pulsing green dot or different border color on nodes that are currently streaming.

- [ ] **Step 2: Auto-Scroll Logic**
Implement a Svelte action or `afterUpdate` hook in `ExpertWorkbench.svelte` to keep the consoles pinned to the bottom during active streaming.

- [ ] **Step 3: Performance Audit**
Run a test query with $k=5$ experts and verify that the UI remains responsive under the high-frequency event load.
