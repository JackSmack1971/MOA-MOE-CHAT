# Roadmap

## Phase 1: Foundation (Week 1)
- [x] D0-1: Execute OpenRouter deposit ($10).
- [x] D0-2: Verify model endpoints (no :preview, no deepseek).
- [x] D0-3: Provision PostgreSQL + pgvector + agent_memory schema.
- [x] D0-4: Deploy EmbeddingService singleton (p95 ≤ 50ms).
- [x] D0-5: Setup secrets vault + pre-commit scan.
- [x] D0-6: Calibrate DALC collapse threshold.
- [x] Project scaffold & AgentNode interface.
- [x] Seed golden fixture set (20 prompts).

## Phase 2: Core Pipeline (Week 2)
- [x] Implement Router, Proposer, and Aggregator roles.
- [x] Integrate DALC diversity module.
- [x] Verify E2E slice on 5 test prompts.

## Phase 3: Halting & Verification (Week 3)
- [x] Implement RMoA delta-based halting.
- [x] Implement Verifier with PoT, Zod, and mathjs oracles.
- [x] Reach Objective 1.1: 5 prompts < 10s turn time (Observed 130s total pipeline, 10s/role).

## Phase 4: Persistence & Resilience (Week 4)
- [x] Implement GRPO persistence layer.
- [x] Implement semantic cache.
- [x] Implement fetchWithBackoff and fallback chain.

## Phase 5: RTM & Hardening (Week 5)
- [x] Map all FRs/NFRs to acceptance tests (SM-5).
- [x] Security audit & PII redaction implementation.

## Phase 6: Validation & V1 Tag (Week 6)
- [x] Full golden fixture regression suite run.
- [x] Final performance benchmark and Success Metrics validation.
- [x] Cut V1.0 tag.
