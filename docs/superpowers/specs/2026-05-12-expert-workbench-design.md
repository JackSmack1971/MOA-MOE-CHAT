# Design Spec: Expert Workbench (Parallel Intermediate Streaming)

**Date**: 2026-05-12
**Topic**: Expert Workbench
**Status**: DRAFT
**Author**: Antigravity

## 1. Objective
Reduce perceived Time To First Token (TTFT) and increase transparency of the MoA/MoE reasoning process by streaming intermediate expert perspectives directly to the UI before final synthesis.

## 2. Architecture & Data Flow
The orchestration pipeline will be updated to yield interleaved chunk events for all active experts.

### SSE Event Schema
A new event type `expert_chunk` will be introduced:
```typescript
{
  type: 'expert_chunk',
  data: {
    nodeId: string,   // Unique ID of the expert (e.g., 'nvidia/nemotron-3-super-120b-a12b:free')
    content: string,  // The new token/chunk
    step: number      // Current refinement step (0 = initial, 1..10 = refinement)
  }
}
```

### Data Pipeline
1. **Orchestrator**: Wraps `callModelStream` calls in the parallel processing loops.
2. **Channeling**: Chunks are yielded to the SSE stream as they arrive from OpenRouter.
3. **UI Aggregation**: The frontend appends chunks to a per-node buffer in the `expertStreams` reactive state.

## 3. Frontend: The Workbench (Quadrant 2)
The "System Telemetry" view will dynamically switch to the "Expert Workbench" when orchestration is active.

### ExpertWorkbench.svelte [NEW]
- **Grid Layout**: Displays up to $k=3$ mini-terminals.
- **Micro-Terminal Component**:
    - **Header**: Shortened Model ID + "LIVE" status pulse.
    - **Body**: Scroll-locked terminal area using `JetBrains Mono`.
    - **Aesthetic**: Cyber-Brutalist styling (scanlines, high-contrast borders).
- **Auto-Cleanup**: Consoles reset or update when moving from "Initial Responses" to "Refinement Step N".

## 4. Backend: Parallel Yielding
The `Orchestrator.executeStreaming` method will be refactored to allow yielding from within `Promise.all` contexts.

### Modifications
- **callModelStream**: Support an `onChunk` callback that bubbles tokens up to the Orchestrator.
- **Async Iteration**: Use an internal queue or `AsyncGenerator` merging to ensure interleaved SSE events are emitted without blocking the pipeline progression.

## 5. Success Criteria
- **TTFT Improvement**: Perceived TTFT reduced from >10s to <2s.
- **Transparency**: User can verify expert reasoning quality in real-time.
- **Performance**: Browser memory usage remains stable even with multiple parallel streams.

## 6. Self-Review
1. **Placeholder scan**: None.
2. **Internal consistency**: Data flow matches component descriptions.
3. **Scope check**: Focused on Q2 UI and Orchestrator yielding logic.
4. **Ambiguity check**: Event schema explicitly defines `step` and `nodeId`.
