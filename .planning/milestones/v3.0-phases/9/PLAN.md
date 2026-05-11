# Plan: Phase 9 - Local Web UI & SSE Orchestration (V3)

## Goal
Deliver a premium, local web-based interface for the Symbolic-MoE chatbot, featuring real-time graph visualization and token streaming, while maintaining a single-executable deployment profile.

## User Review Required
> [!IMPORTANT]
> This phase shifts the project from a CLI-first tool to a Web-first local server. The CLI will be retained as an alternative entry point, but the primary interaction will move to the browser. 

## Proposed Changes

### [Component] Frontend (Svelte 5)
#### [NEW] [src/ui/](file:///c:/workspaces/MOA-MOE-CHAT/src/ui/)
Scaffold Svelte 5 project with static adapter.
- `App.svelte`: Main layout with glassmorphism.
- `Graph.svelte`: D3 force-directed visualization.
- `Chat.svelte`: Streaming message component.

---

### [Component] Backend (Express + SSE)
#### [NEW] [src/server.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/server.ts)
Express server to serve `dist/` and handle `/api/chat` SSE.

#### [MODIFY] [callModel.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/core/callModel.ts)
Update to support `Stream` responses from OpenRouter and pass chunks back to the orchestrator.

#### [MODIFY] [orchestrator.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/core/orchestrator.ts)
Implement `executeStreaming` to yield progress events (skill extraction, graph build) and token chunks to the SSE pipe.

---

### [Component] Orchestration & Packaging
#### [NEW] [src/index.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/index.ts) (Refactor)
Implement the "Launcher" logic:
1. Check/Initialize Postgres (child process).
2. Start Express server.
3. Auto-launch system browser via `open`.

#### [NEW] [scripts/build-sea.js](file:///c:/workspaces/MOA-MOE-CHAT/scripts/build-sea.js)
Node.js script to create the Single Executable Application (SEA) using `node --experimental-sea-config`.

---

## Verification Plan

### Automated Tests
- `npm run test:ui`: Verify Svelte component rendering (Vitest).
- `npm run test:server`: Verify SSE endpoint availability and chunking.

### Manual Verification
- Run the compiled binary and confirm:
  - Postgres starts automatically.
  - Browser opens to `localhost:3000`.
  - Expert graph pulses during "Bidirectional Message Passing".
  - Skills dashboard updates after query extraction.
