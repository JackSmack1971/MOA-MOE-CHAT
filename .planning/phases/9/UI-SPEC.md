# UI Specification: V3 Symbolic-MoE Local Web UI (Phase 9)

## 1. Vision & Aesthetics
- **Theme**: Ultra-premium Dark Mode with Glassmorphism accents.
- **Color Palette**: 
  - Background: Deep Charcoal (`#0A0A0B`)
  - Accent (Primary): Vibrant Cyan (`#00F2FF`) for "Logic" expert.
  - Accent (Secondary): Neon Magenta (`#FF00E5`) for "Coding" expert.
  - Surface: Translucent Slate (`rgba(30, 41, 59, 0.4)`) with `backdrop-filter: blur(12px)`.
- **Typography**: Inter for body, Outfit for headers.

## 2. Core Components

### A. Graph Visualizer (D3.js)
- **Visual**: A force-directed graph of the $k=3$ experts selected for the turn.
- **Behavior**:
  - **Node Pulse**: Glows when the expert is actively processing.
  - **Edge Thickness**: Corresponds to the Adjacency Score (relevance + skill alignment).
  - **Hover**: Shows expert proficiency vector.

### B. Chat Interface (Svelte 5)
- **Streaming**: Token-by-token rendering via SSE.
- **Markdown Support**: Full syntax highlighting for code blocks.
- **Thought Process**: A "collapsible bubble" showing the forward/reverse pass logs.

### C. Skill Dashboard
- **Visual**: A horizontal bar chart or "radar chart" showing the **Symbolic Skill Vector** extracted from the query.
- **Impact**: Shows how skills influenced the graph topology in real-time.

### D. Telemetry Sidebar
- Real-time stats:
  - **Token Usage**: Running total (Prompt/Completion).
  - **Latency**: Per-expert and E2E total.
  - **DALC Score**: Diversity check indicator.
  - **Status**: Pipeline step tracking (Extraction -> Selection -> Graph -> Bidirectional -> Pooling).

## 3. Architecture & Build Pipeline

### Frontend (Static Asset)
- **Framework**: Svelte 5 (Runes-first).
- **Styling**: Vanilla CSS with Design Tokens.
- **Adapter**: `@sveltejs/adapter-static` for zero-V-DOM performance.

### Backend (Node.js SEA)
- **Role**: Serve static assets + Proxy GoA logic.
- **Communication**: 
  - `POST /api/chat`: Triggers `Orchestrator.execute` with SSE streaming enabled.
  - `GET /api/events`: SSE endpoint for pipeline telemetry.
- **Orchestration**: 
  - Startup: `initdb` (if missing) + `pg_ctl start` as child process.
  - Shutdown: Graceful `SIGTERM` listener for child process cleanup.
  - Launch: Auto-open default browser to `localhost:3000`.

## 4. Verification Gaps
- **SSE Latency**: Ensure Node.js `callModel` stream chunking doesn't lag.
- **SEA Size**: Bundle size target < 150 MB (excluding Postgres binaries).
- **Memory**: Verify < 300 MB resident for the full Node + UI + Postgres daemon stack.

---
**Traces**: PRD §UI, Blueprint §V3, ADR-013
