# Todo: UAT Hardening & Verification

## Items
- [ ] **T-001**: Execute `scripts/d0-verify-memory.ts` under sustained load (5+ concurrent users).
- [ ] **T-002**: Perform manual audit of `logs/pino.log` to ensure mock API keys are redacted.
- [ ] **T-003**: Verify `POT_EXECUTION` oracle for Code-1 fixture to ensure sandbox isolation.
- [ ] **T-004**: Audit graph sparsity for `math-2` fixture; ensure $\tau=0.05$ produces a meaningful expert subgraph.

## Context
Extracted from AUDIT-UAT.md following V2 GoA migration.
Priority: High
Area: Quality / Security
