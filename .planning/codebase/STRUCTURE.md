# Structure

## Directory Layout
- `src/config/`: Configuration for models, agents, and thresholds.
- `src/core/`: Orchestrator and AgentNode core logic.
- `src/services/`: Embedding, DALC, RMoA, and Verifier implementations.
- `src/oracles/`: Executor sandboxes (PoT, Math, Zod).
- `src/db/`: Database clients, schemas, and migrations.
- `src/memory/`: Semantic Cache and GRPO logic.
- `src/prompts/`: Immutable SOP prompt templates.
- `src/types/`: Centralized Zod and TypeScript types.
- `src/utils/`: Logger, Sanitizer, Telemetry.
- `fixtures/`: Golden fixture set and companion data.
- `tests/`: Unit, Integration, and E2E regression suites.
- `scripts/`: Day-0 validation and calibration scripts.
