# Phase 5 Research: RTM & Hardening

## Objectives
- 100% RTM (Requirements Traceability Matrix) coverage in the codebase (SM-5).
- Security hardening (PII redaction, environment variable protection).
- Structured logging implementation via Pino.
- Finalization of Golden Fixture regression logic for Phase 6.

## RTM Audit
Need to verify traceability comments for:
- **SM-1**: 40% reduction in HAL (Pass via Verifier).
- **SM-2**: TTFT Logic/Math (Observed ~130s, need to confirm V1 acceptance).
- **SM-3**: 95% Hallucination interception (Pass 100%).
- **SM-4**: 40% Cache Hit Rate (Pass 100%).
- **SM-6**: Resident memory < 6.3GB.
- **SM-7**: Diversity cosine similarity ≤ 0.85 (Pass).
- **FR-01..12**: Orchestrator, Proposer, Aggregator, DALC, RMoA, Verifier, Resilience.

## Security Hardening
- **PII Redaction**: Ensure user queries are not logged in plain text if PII is detected (basic whitelist/regex).
- **Secret Management**: Verify `.env` is correctly ignored and no keys are leaked in logs.
- **PoT Safety**: Review `vm.runInNewContext` settings for timeouts and memory limits.

## Structured Logging (Pino)
- Replace `console.log` with structured `pino` logger.
- Log levels: `info`, `warn`, `error`, `debug`.
- Redaction of `Authorization` headers and user sensitive data.

## Resident Memory (SM-6)
- Perform a baseline memory check of the Node.js process with Transformers.js and pg pool.
- Target: ≤ 6.3 GB.

## Golden Fixture Logic
- Finalize `tests/e2e/golden-fixture.regression.ts` to run all 20 prompts.
- Ensure the Verifier oracles are correctly assigned to each fixture.
