# Roadmap

## Phase 1: Foundation (Week 1)
- [ ] D0-1: Execute OpenRouter deposit ($10).
- [ ] D0-2: Verify model endpoints (no :preview, no deepseek).
- [ ] D0-3: Provision PostgreSQL + pgvector + agent_memory schema.
- [ ] D0-4: Deploy EmbeddingService singleton (p95 ≤ 50ms).
- [ ] D0-5: Setup secrets vault + pre-commit scan.
- [ ] D0-6: Calibrate DALC collapse threshold.
- [ ] Project scaffold & AgentNode interface.
- [ ] Seed golden fixture set (20 prompts).

## Phase 2: Core Pipeline (Week 2)
- [ ] Implement Router, Proposer, and Aggregator roles.
- [ ] Integrate DALC diversity module.
- [ ] Verify E2E slice on 5 test prompts.

## Phase 3: Halting & Verification (Week 3)
- [ ] Implement RMoA delta-based halting.
- [ ] Implement Verifier with PoT, Zod, and mathjs oracles.
- [ ] Reach Objective 1.1: 5 prompts < 10s turn time.

## Phase 4: Persistence & Resilience (Week 4)
- [ ] Implement GRPO persistence layer.
- [ ] Implement semantic cache.
- [ ] Implement fetchWithBackoff and fallback chain.

## Phase 5: RTM & Hardening (Week 5)
- [ ] Map all FRs/NFRs to acceptance tests.
- [ ] Security audit & PII redaction implementation.

## Phase 6: Validation & V1 Tag (Week 6)
- [ ] Full golden fixture regression suite run.
- [ ] Final performance benchmark and Success Metrics validation.
- [ ] Cut V1.0 tag.
