# Phase 6 Research: Validation & V1 Tag

## Objectives
- 100% Pass Rate on the 20-prompt Golden Fixture Set.
- Final Day-0 Audit completion.
- Release candidate (V1.0) tagging.

## Golden Fixture Set (20 prompts)
- **Math (5)**: Quadratic equations, symbolic calculus, logic puzzles.
- **Code (5)**: Tic-tac-toe, snake, REST API stubs, SQL queries.
- **Logic (5)**: Deductive reasoning, formal fallacies, syllogisms.
- **Conversational (5)**: Persona stability, helpfulness, tone.

## Verification Gate
- **Script**: `tests/e2e/golden-fixture.regression.ts`.
- **Criteria**:
    - 100% Pass Rate.
    - SM-1..SM-7 verified.
    - Diversity enforced (DALC).
    - Halting adaptive (RMoA).
    - Oracles extrinsic (Verifier).
    - Persistent (Memory/Cache).
    - Resilient (Fallback).

## Day-0 Checklist (Final Audit)
- **D0-1**: Golden Fixture set exists. (YES)
- **D0-2**: DB Schema deployed (PostgreSQL + pgvector). (YES)
- **D0-3**: OpenRouter credentials secure. (YES)
- **D0-4**: EmbeddingService pre-warmed. (YES)
- **D0-5**: Orchestrator loop operational. (YES)
- **D0-6**: Resident memory < 6.3 GB. (YES)

## Release Steps
1. Execute final regression.
2. Update `ROADMAP.md` and `STATE.md`.
3. Create `V1_RELEASE_NOTES.md`.
4. Git Tag `v1.0.0`.
