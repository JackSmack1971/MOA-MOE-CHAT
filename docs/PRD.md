```markdown
# PRODUCT REQUIREMENTS DOCUMENT

**Solo-Deployable MoA/MoE Hybrid Chatbot Framework**  
**Self-MoA + DALC Enforcement + RMoA Adaptive Halting**

**Version 1.0** | **April 2026** | **Derived from Blueprint v2.3**  
**Classification:** Internal / Solo Developer | **Status:** APPROVED FOR IMPLEMENTATION

## 1. Executive Summary

### 1.1 Problem
Single-model chatbot deployments cannot simultaneously optimize across reasoning, code generation, and conversational retrieval domains. Two dominant failure modes define the current landscape:
- Heterogeneous MoA architectures introduce cross-distribution hallucination amplification when different-architecture models critique each other's outputs.
- Self-MoA implementations collapse representational diversity: empirically measured mean pairwise cosine similarity of 0.888 in chain-of-thought embedding space mathematically guarantees that majority-voting synthesis amplifies shared errors rather than correcting them.

### 1.2 Solution
The Solo-Deployable MoA/MoE Hybrid Chatbot Framework orchestrates a single top-tier 120B Mixture-of-Experts model (NVIDIA Nemotron 3 Super 120B-A12B) through a Self-MoA architecture with four formalized agent roles: Router, Proposer, Aggregator, and Verifier. The system enforces output diversity via the Diversity-Aware Latent Consensus (DALC) protocol, preventing the documented 0.888-similarity collapse from contaminating Aggregator synthesis. Extrinsic oracle verification (Program-of-Thought execution, Zod schema validation, symbolic math evaluation) replaces ungrounded LLM self-critique for deterministic output classes.

### 1.3 Market Opportunity
Target audience: solo AI systems developers and AI research practitioners who require enterprise-grade multi-agent reasoning without capital expenditure on dedicated GPU infrastructure. The system deploys entirely on a CPU-only consumer laptop via zero-cost free-tier API inference — zero infrastructure cost beyond a one-time $10 OpenRouter deposit to unlock production-viable rate limits (~1,000 RPD = 250 MoA turns/day).

### 1.4 Key Outcomes (V1 Targets)

| Metric | Target | Baseline |
|--------|--------|----------|
| Self-MoA Accuracy (AlpacaEval 2.0 equivalent) | ≥ 65% | 65.1% (6-proposer heterogeneous MoA) |
| Post-DALC Cosine Similarity | ≤ 0.85 (target < 0.80) | 0.888 (unconstrained) |
| Verifier Hallucination Interception Rate | ≥ 95% | N/A (new capability) |
| RMoA Early-Exit Rate | ≥ 30% of prompts | N/A (replaces static counter) |
| Daily Turn Capacity (post-deposit) | 250 complex turns | 50 turns (unfunded) |

## 2. Problem Statement

### 2.1 Root Cause: Representational Collapse in Self-MoA
Standard Self-MoA implementations rotate persona prompts across instances of the same model, creating an illusion of diversity. Empirical measurement reveals that same-model persona outputs exhibit a mean pairwise cosine similarity of 0.888 in chain-of-thought embedding space. At this similarity level, majority-voting synthesis amplifies shared errors rather than resolving them — the mathematical equivalent of asking the same witness to testify twice and treating it as corroboration.

**CRITICAL FINDING**  
The 0.888 cosine similarity value is not an edge case — it is the measured central tendency of unconstrained same-model Self-MoA. Any pipeline without active diversity enforcement is operating in near-collapse state by default.

### 2.2 Failure Modes Addressed

| Failure Mode | Root Cause | V1 Mitigation |
|--------------|------------|---------------|
| Representational collapse in Self-MoA | 0.888 mean cosine similarity | DALC enforcement (threshold ≤ 0.85) |
| Cross-distribution hallucination amplification | Heterogeneous model critique | Self-MoA eliminates cross-distribution friction |
| Ungrounded Verifier self-critique | LLM-only verification loops | Extrinsic oracle wrapping (PoT/Zod/mathjs) |
| Session collapse from rate-limit cascades | Unfunded 200 RPD ceiling = 50 turns/day | $10 deposit → ~1,000 RPD; exponential backoff + fallback chain |
| Context window inflation (V2) | N full-text Proposer outputs concatenated | Symbolic-MoE compression (V2 scope) |

### 2.3 Quantitative Evidence
- 0.888: Measured mean pairwise cosine similarity of unconstrained same-model persona outputs (chain-of-thought embedding space). Source: Blueprint §1.2.
- 65.1%: AlpacaEval 2.0 baseline for 6-proposer heterogeneous MoA (Tong et al., 2024). This is the V1 accuracy floor the Self-MoA + DALC system must match.
- 0.588: Empirical success coefficient of the Aggregator role in the Together AI MoA regression analysis — designating it as the highest-criticality pipeline component.
- 50 → 250: Daily MoA turn capacity uplift from OpenRouter deposit ($10 one-time → 200 RPD to ~1,000 RPD).
- ~240s → ~100s: Complex-query TTFT reduction from linear MoA to 3-agent GoA topology (V2 target, ~50% reduction).

## 3. Vision & Goals

### 3.1 Core Vision
To deliver a self-hardening, ACID-compliant Self-MoA cognitive pipeline — with DALC-enforced output diversity and RMoA-based adaptive halting — architected from Day 0 for migration to a Graph-of-Agents topology, that any solo developer can instantiate on a consumer laptop, validate against a golden fixture set, and extend without rewriting the core execution loop.

### 3.2 Strategic Goals
**Goal 1 — Accuracy Parity**  
Demonstrate that a DALC-enforced Self-MoA topology applied to a single 120B MoE model achieves ≥ 65% accuracy on the AlpacaEval 2.0 benchmark equivalent — matching the known 6-proposer heterogeneous MoA baseline — while operating within free-tier rate limits on a CPU-only consumer laptop.

**Goal 2 — Open-Weight Replicability**  
Establish a replicable open-weight-only architecture deployable via a single OpenRouter API key and a Node.js/TypeScript environment, with no proprietary model dependencies on the critical path and a formally validated Requirements Traceability Matrix.

**Goal 3 — Zero-Rewrite V2 Migration Path**  
Architect the AgentNode interface abstraction and DALC pipeline from Day 0, ensuring the V1 Self-MoA codebase migrates to a Graph-of-Agents topology (V2) by swapping modelIdentifier strings and adding edge-construction logic — without rewriting the core execution loop.

### 3.3 V1 SMART Objectives

| Objective | Metric | Target | Timeline |
|-----------|--------|--------|----------|
| E2E pipeline slice operational | 5 test prompts → coherent responses | < 10 seconds per turn | Week 3 of 6 |
| Security posture clean | Critical/major open findings | 0 findings | Before first API call |
| RTM complete | FRs + NFRs mapped to acceptance tests | ≥ 10 FRs + ≥ 5 NFRs | Week 2, Day 1 |
| DALC effectiveness | Post-DALC mean cosine similarity | ≤ 0.85 | V1 tag cut |
| Rate-limit sustainability | 8-hour session, 250 complex turns | 0 unhandled 429s | V1 tag cut |

## 4. User Research & Personas

### Persona 1: Solo AI Systems Developer

| Attribute | Detail |
|-----------|--------|
| Role | Independent developer / small-team AI engineer |
| Primary Need | Zero-cost multi-agent reasoning on consumer hardware |
| Setup Requirement | Reproducible local environment from npm install + npm run db:migrate |
| Technical Need | Zod-validated API contracts; DALC similarity scores in telemetry to diagnose collapse events |
| Primary Pain Point | Heterogeneous MoA collapses under cross-distribution hallucination amplification |
| Secondary Pain Point | Self-MoA without diversity enforcement amplifies shared errors at 0.888 cosine correlation |
| Tertiary Pain Point | Free-tier 429 cascades interrupt sessions without circuit breakers |
| Success Condition | Full pipeline running on laptop; DALC triggering on high-similarity turns; 250 turns/day reliable |

### Persona 2: AI Research Practitioner / Benchmark Evaluator

| Attribute | Detail |
|-----------|--------|
| Role | Independent researcher; ML systems evaluator |
| Primary Need | Reproducible Self-MoA + DALC experiments with golden fixture regression suite |
| Diagnostic Need | DALC similarity and delta-convergence logs for collapse analysis |
| Documentation Need | Formal specifications with TypeScript/LaTeX math — no base64 PNG formula blobs |
| Primary Pain Point | Published MoA blueprints lack formal specifications and acceptance criteria for independent reproduction |
| Secondary Pain Point | No test plans for accuracy delta measurement vs. standard MoA baselines |
| Success Condition | Can reproduce accuracy delta and collapse analysis from RTM + fixture set + telemetry logs alone |

## 5. Competitive Analysis

### 5.1 Architecture Landscape
The V1 architecture positions itself within the Self-MoA quadrant — single-model persona rotation with enforced diversity — rather than heterogeneous MoA or monolithic single-model deployments.

| Architecture | Accuracy | Hallucination Risk | Cost | Complexity | Collapse Risk |
|--------------|----------|--------------------|------|------------|---------------|
| Monolithic Single Model | Moderate | Moderate | Zero (free tier) | Low | None |
| Heterogeneous MoA (Tong 2024) | 65.1% AlpacaEval | High (cross-dist.) | High (multiple keys) | High | Cross-distribution |
| Self-MoA (unconstrained) | ~65% but fragile | Moderate-High | Zero (free tier) | Medium | 0.888 cosine collapse |
| Self-MoA + DALC (V1 target) | ≥ 65% (stable) | Low (oracle-verified) | Zero + $10 deposit | Medium-High | Mitigated to < 0.85 |
| GoA (V2 target) | 88-90% MMLU | Low | Zero (free tier) | High | Structural diversity |

### 5.2 Model Pool Comparison (OpenRouter Free Tier, April 2026)

| Model | Role | Params (Total/Active) | Context | Status |
|-------|------|-----------------------|---------|--------|
| nvidia/nemotron-3-super-120b-a12b:free | Primary (all 4 roles) | 120B / 12B active | 128K | ACTIVE — V1 Primary |
| google/gemma-4-31b-it:free | Fallback 1 | 31B / 31B | 128K | ACTIVE — V1 Fallback1 |
| openai/gpt-oss-120b:free | Fallback 2 | 117.9B / 5.1B active | 131K | ACTIVE — replaces DeepSeek |
| qwen/qwen3-coder-480b-a35b:free | V2 Proposer (code) | 480B / 35B active | 128K | ACTIVE — V2 candidate |
| inclusionai/ling-2.6-flash:free | V2 Proposer (fast) | 104B / 7.4B active | TBD | PENDING D0-2 verification |
| deepseek/deepseek-r1-0528:free | DEPRECATED | N/A | N/A | REMOVED April 26, 2026 |
| tencent/hy3-preview:free | REJECTED | N/A | N/A | :preview flag — hard excluded |
| stepfun/step-3.5-flash:free | PERMANENTLY EXCLUDED | N/A | N/A | Instability + April/May 2026 deprecation |

## 6. Feature Requirements (MoSCoW)

### 6.1 Must-Have (M)

**M1 — Self-MoA Persona Rotation Engine**  
Four AgentNode instances (Router / Proposer / Aggregator / Verifier) all backed by nvidia/nemotron-3-super-120b-a12b:free, each with distinct personaPrompt and temperature, executing sequentially per turn.

| Req ID | Requirement | Acceptance Criteria |
|--------|-------------|---------------------|
| FR-01 | AgentNode interface with id, modelIdentifier, personaPrompt, temperature | V2 migration requires only modelIdentifier + personaPrompt swap; no execution loop rewrite |
| FR-02 | Aggregator uses canonical Together AI Aggregate-and-Synthesize meta-prompt verbatim | Prompt matches Tong et al. (2024) moa.py template exactly; DALC score appended; rejects synthesis if dalc_score ≥ 0.85 |
| FR-03 | System prompt (SOP context) structurally immutable across all turns | Near-100% KV prefix cache match; zero dynamic elements before user query |

**M2 — DALC Diversity Enforcement Layer**  
Diversity-Aware Latent Consensus module between Proposer and Aggregator. Embeds both Proposer output and Router routing plan, computes cosine similarity, re-invokes Proposer with orthogonality directive if similarity ≥ 0.85.

| Req ID | Requirement | Acceptance Criteria |
|--------|-------------|---------------------|
| FR-04 | Compute cosineSimilarity(embed(proposerOutput), embed(routerPlan)) every turn; write to metadata.dalc_score | Score logged to agent_memory metadata jsonb on every turn |
| FR-05 | If dalc_score ≥ 0.85: re-invoke Proposer with orthogonality directive (max 2 attempts); log COLLAPSE_UNRESOLVED if both fail | Re-generation directive text exact as specified; max 2 retries enforced |
| FR-06 | Regression test: inject 5 high-similarity outputs (≥ 0.88); assert DALC triggers all 5; post-regen similarity < 0.85 in ≥ 4/5 | Vitest test passing; 80%+ regen success rate confirmed |
| NFR-05 | DALC overhead ≤ 100ms per turn (pre-warmed EmbeddingService singleton) | p95 overhead measured across 100-call test harness |

**M3 — RMoA Adaptive Halting**  
Residual MoA convergence detector monitoring informational delta (L2 norm) between successive Proposer output embeddings. Halts early when delta < ε. Hard ceiling of maxSteps = 10 retained.

| Req ID | Requirement | Acceptance Criteria |
|--------|-------------|---------------------|
| FR-07 | Compute delta_i = &#124;&#124;embed(output_i) - embed(output_{i-1})&#124;&#124;_2 after each Proposer; halt if delta_i < ε (default 0.02) | Early exit triggers before maxSteps on ≥ 30% of fixture prompts (SM-4) |
| FR-08 | Hard ceiling maxSteps = 10 terminates loop regardless of delta state; emit halt_reason: MAX_STEPS_EXCEEDED | Loop never exceeds 10 steps in any test scenario |
| FR-09 | Write delta value and halt_reason to metadata.rmoa_trace per turn | agent_memory row contains rmoa_trace jsonb after every turn |

**M4 — Verifier Node with Extrinsic Oracle Wrapping**  
Verifier sits downstream of Aggregator, upstream of user output. Wraps LLM generation with deterministic oracles: PoT subprocess for code, Zod schema for structured outputs, mathjs for numeric assertions.

| Req ID | Requirement | Acceptance Criteria |
|--------|-------------|---------------------|
| FR-10 | Verifier wraps LLM with extrinsic oracle (PoT / Zod / mathjs) per query class; raw oracle error injected verbatim into Proposer revision signal | At least one oracle active per code/structured/math output; LLM_ONLY only for conversational |
| FR-10a | Verifier intercepts ≥ 95% of synthetic hallucinated responses in golden regression fixture | Regression fixture contains ≥ 5 code cases where PoT catches error that pure self-critique would pass |
| FR-11 | On FAIL: one Proposer re-invocation with raw oracle output; second failure returns structured error to user | User never receives silently incorrect output; verdict payload includes oracleOutput + oracleType |
| FR-12 | All verdicts logged with: promptHash, stepIndex, verdict, oracleType, oracleOutput, dalcScoreAtVerification, latencyMs | Telemetry schema validated by Zod before write |

**M5 — Secrets Management & Input Sanitization**

| Req ID | Requirement | Acceptance Criteria |
|--------|-------------|---------------------|
| FR-16 | CI fails on any committed credential literal detected by git-secrets or truffleHog | Test commit with literal API key triggers CI failure |
| NFR-01 | No API key, session token, or PII in any log, telemetry record, or DB column in plaintext | Log audit shows zero credential or PII fields |
| NFR-02 | User inputs pass whitelist filter before tool schema injection; rejected inputs return { error: INPUT_REJECTED, reason: string } | Injection-pattern inputs return structured rejection, never reach API call |

**M6 — Semantic Cache + Rate-Limit Resilience**

| Req ID | Requirement | Acceptance Criteria |
|--------|-------------|---------------------|
| FR-20 | Pre-API semantic cache lookup; similarity ≥ 0.98 returns cache hit with { source: semantic_cache } telemetry | Cache tested with near-duplicate prompt pairs |
| FR-21 | All API calls use fetchWithBackoff: max 3 retries, base 2000ms, ×2 multiplier, 0-500ms jitter | Zero unhandled 429s in simulated 250-turn session |
| FR-22 | Fallback chain: Nemotron → Gemma-4-31B → GPT-OSS-120B; each transition logged with event, fromModel, toModel, reason | deepseek-r1-0528:free absent from all routing code; fallback chain tested with primary model disabled |

### 6.2 Should-Have (S)

**S1 — pgvector GRPO Persistence Layer**

| Req ID | Requirement | Priority Rationale |
|--------|-------------|--------------------|
| FR-17 | agent_memory table with 768-dim HNSW index, reward_score, metadata jsonb (dalc_score, rmoa_trace) | Enables GRPO branching (V2); audit trail; collapse analysis |
| FR-18 | All GRPO write-backs in BEGIN/COMMIT transaction; exceptions trigger full ROLLBACK | ACID compliance mandatory for data integrity |
| FR-19 | Schema bootstrapped via npm run db:migrate; integration test simulates mid-transaction failure + rollback | Reproducibility requirement for Persona 2 |
| NFR-03 | Daily pg_dump via cron to ./backups/; restore test in integration suite | Data loss prevention for long-running research sessions |

**S2 — Reasoning Chain Preservation**

| Req ID | Requirement | Priority Rationale |
|--------|-------------|--------------------|
| FR-13 | Proposer asserts reasoning_details non-null before history append; one retry with reasoning: true if null | Multi-turn logical continuity cannot be assumed — must be enforced |
| FR-14 | Context compression preserves reasoning_details in full; only assistant prose compressed; ratio logged | Reasoning chain loss = silent quality regression |
| FR-15 | Automated test: reasoning_details non-null across simulated 10-turn session for all 5 E2E prompts | Verifiable acceptance criterion per Objective 1.1 |

### 6.3 Won't-Have in V1 (W)

| Feature | Reason Deferred | Target Version |
|---------|-----------------|----------------|
| Parallel Proposer Layer | RPD math borderline; Node.js concurrency overhead incompatible with 6-week window | V2 |
| Graph-of-Agents Topology | Dynamic DAG construction complexity incompatible with solo 6-week window | V2 |
| Symbolic-MoE Adaptive Routing | Requires GoA context window bottleneck (V2 dependency) | V2 alongside GoA |
| Structural Model Diversity (Heterogeneous Topology) | DALC enforcement is V1 substitute within operational constraints | V3+ |
| AutoPDL / Successive Halving Prompt Optimization | Research-phase feature; V1 prompt space already constrained by canonical meta-prompt | V2 |
| Full GRPO Branching + Comparative Evaluation | V1 delivers schema, write-back, fixture seeding, and reward_score update only | V2 |
| Multi-User / Concurrent Sessions | Post-PoC; requires production cloud deployment infrastructure | Post-PoC |

## 7. Technical Requirements

### 7.1 Mandatory Technology Stack

| Component | Technology | Version / Config |
|-----------|------------|------------------|
| Inference Gateway | OpenRouter Unified API | https://openrouter.ai/api/v1 |
| Agent SDK | @openrouter/agent | Latest stable |
| Schema Validation | zod | Latest stable |
| Embedding Model | nomic-embed-text-v1.5 | dtype: q8, device: wasm |
| Embedding Runtime | @huggingface/transformers | v4 (ONNX/WASM) |
| Vector + Relational DB | PostgreSQL 16+ with pgvector | HNSW, vector_cosine_ops, 768-dim |
| Structured Logging | pino | With PII field redaction config |
| Secrets Management | dotenv-vault or OS keychain | Pre-commit git-secrets scan enforced |
| Runtime | Node.js | ≥ v20 LTS, TypeScript strict mode |
| Testing | vitest + supertest | Unit, integration, E2E |
| PoT Oracle Sandbox | Node.js vm.runInNewContext | Isolated; no network access inside sandbox |
| Symbolic Evaluator | mathjs | Expression parsing for numeric Verifier assertions |

### 7.2 AgentNode Role Configuration (V1)

| Role | Model Identifier | Temperature | Rationale |
|------|------------------|-------------|-----------|
| Router | nvidia/nemotron-3-super-120b-a12b:free | 0.7 | Intent classification; moderate diversity acceptable |
| Proposer | nvidia/nemotron-3-super-120b-a12b:free | 0.7 (range 0.6–0.8) | High temp enforces broad latent-space search; low temp pre-collapses output before DALC |
| Aggregator | nvidia/nemotron-3-super-120b-a12b:free | 0.2 (range 0.1–0.3) | Low temp enforces deterministic synthesis; highest-criticality role (success coeff 0.588) |
| Verifier | nvidia/nemotron-3-super-120b-a12b:free | 0.2 | Deterministic verdict emission; oracle output must not be hallucinated |

### 7.3 Key Interfaces (TypeScript)

**AgentNode Interface**
```typescript
interface AgentNode {
  id: string;
  modelIdentifier: string;  // Single string swap enables V2 heterogeneous migration
  personaPrompt: string;    // Immutable SOP block — no dynamic elements permitted
  temperature: number;
}
```

**DALC Module**

```typescript
interface DALCResult {
  similarity: number;       // Cosine similarity (proposerOutput vs routerPlan)
  status: 'PASS' | 'COLLAPSE_DETECTED' | 'COLLAPSE_UNRESOLVED';
  regenerationAttempts: number;
}

async function enforceDALC(
  proposerOutput: string,
  routerPlan: string,
  collapseThreshold: number = 0.85,
  maxRegenerations: number = 2
): Promise<DALCResult>
```

**RMoA Halting Module**

```typescript
interface RMoAHaltDecision {
  shouldHalt: boolean;
  delta: number;            // L2 norm of embedding difference
  haltReason: 'CONVERGED' | 'MAX_STEPS_EXCEEDED' | 'NOT_HALTED';
  stepCount: number;
}

function checkConvergence(
  currentOutputEmbedding: number[],
  previousOutputEmbedding: number[],
  epsilon: number = 0.02,
  currentStep: number,
  maxSteps: number = 10
): RMoAHaltDecision
```

### 7.4 Database Schema

**agent_memory DDL**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE agent_memory (
  id           bigserial  PRIMARY KEY,
  content      text       NOT NULL,
  metadata     jsonb,     -- stores: dalc_score, rmoa_trace, halt_reason
  embedding    vector(768),
  reward_score numeric    DEFAULT 0.0,
  created_at   timestamp  DEFAULT current_timestamp
);
CREATE INDEX ON agent_memory USING hnsw (embedding vector_cosine_ops);
```

### 7.5 Memory Budget (16GB Consumer Laptop)

| Component                        | Estimated Resident Memory |
| -------------------------------- | ------------------------- |
| nomic-embed-text-v1.5 (q8 WASM)  | ~200 MB                   |
| PostgreSQL 16 daemon             | ~500–750 MB               |
| Node.js orchestrator application | ~150–300 MB               |
| OS + IDE + browser               | ~3–5 GB                   |
| **Total estimated**              | ~4.1–6.3 GB               |
| **Available headroom**           | ~9.7–11.9 GB              |

### 7.6 Performance SLOs (p95 per Query Class)

| Query Class       | Roles Activated                                              | p95 Target   |
| ----------------- | ------------------------------------------------------------ | ------------ |
| Conversational    | Router → Proposer → Aggregator                               | ≤ 3 seconds  |
| Deep Logic / Math | Router → Proposer (reasoning) → DALC → Aggregator → Verifier | ≤ 15 seconds |
| Code Generation   | Router → Proposer (low temp) → DALC → Aggregator → Verifier  | ≤ 20 seconds |

## 8. Risk Assessment

### 8.1 Risk Matrix

| Risk ID | Risk                                                                           | Severity | Likelihood | Mitigation                                                                                                       | Owner            |
| ------- | ------------------------------------------------------------------------------ | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------- | ---------------- |
| R-01    | DALC re-generation success rate < 80% (post-regen similarity remains ≥ 0.85)   | HIGH     | MEDIUM     | Tighten collapse threshold; increase temperature delta on retry; add second Proposer invocation with higher temp | Solo Dev         |
| R-02    | OpenRouter free-tier endpoint removal during 6-week window                     | HIGH     | LOW        | Fallback chain (Gemma → GPT-OSS-120B); D0-2 daily verification script; Qwen-coder secondary fallback             | Solo Dev         |
| R-03    | nomic-embed-text-v1.5 WASM exceeds 42ms p95 on target hardware                 | MEDIUM   | MEDIUM     | Benchmark on actual hardware during D0-4; q4 quantization fallback; pre-warm as singleton at startup             | Solo Dev         |
| R-04    | PoT oracle sandbox escape (vm.runInNewContext)                                 | HIGH     | LOW        | No network access inside sandbox; CPU/memory limits; no fs module permitted inside context                       | Solo Dev         |
| R-05    | PostgreSQL HNSW index not available (pgvector version mismatch)                | MEDIUM   | LOW        | Verify pgvector ≥ 0.5.0; IVFFLAT fallback with explicit rebuild if HNSW unavailable                              | Solo Dev         |
| R-06    | 6-week timeline breach from DALC calibration complexity                        | MEDIUM   | MEDIUM     | Day-0 DALC calibration run (D0-6) before code begins; MoSCoW deferral of Should-Have features if behind          | Solo Dev         |
| R-07    | Aggregator receives unconstrained DALC score and proceeds with collapsed input | HIGH     | LOW        | FR-02 hard-codes rejection if dalc_score ≥ 0.85 in Aggregator persona prompt; logged as COLLAPSE_UNRESOLVED      | Solo Dev         |
| R-08    | Supply chain risk from unvetted external install commands in spec              | CRITICAL | ELIMINATED | ADR-REJECTED-001: npx --antigravity command removed; Appendix B rejection log documents rationale                | Blueprint Author |

**RISK ELIMINATED — Supply Chain (R-08)**  
The v2.3 blueprint explicitly rejected an instruction to execute "npx --antigravity install sickn33/antigravity-awesome-skills". Reasons: (1) --antigravity is not a valid npx flag; (2) sickn33/antigravity-awesome-skills has no npm registry provenance; (3) embedding an unvetted external install in an executable specification is a standard supply chain attack pattern. This rejection is logged permanently in Appendix B of the blueprint.

## 9. Success Metrics

| Metric ID | Metric                    | Target                                                             | Measurement Method                                                    | V2 Benchmark                                     |
| --------- | ------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------ |
| SM-1      | Self-MoA + DALC Accuracy  | ≥ 65% on 20-prompt golden fixture                                  | Automated RTM test suite                                              | ≥ 88–90% MMLU (GoA, frontier MoE)                |
| SM-2      | DALC Effectiveness        | Post-DALC mean cosine ≤ 0.85 (target < 0.80)                       | telemetry.dalc_score per turn                                         | Structural diversity via heterogeneous Proposers |
| SM-3      | Verifier Efficacy         | ≥ 95% hallucinated response interception                           | Regression fixture with injected hallucinations                       | ≥ 92% HumanEval (GoA)                            |
| SM-4      | RMoA Efficiency           | Early-exit on ≥ 30% of fixture prompts before maxSteps             | metadata.rmoa_trace halt_reason analysis                              | ~100s complex-query TTFT (vs. ~240s linear MoA)  |
| SM-5      | Latency SLOs Met          | All three p95 targets (§6.1) satisfied on 20-prompt synthetic load | pino TTFT logs per query class                                        | GoA ~50% TTFT reduction over linear MoA          |
| SM-6      | Security Posture Clean    | 0 critical or major security findings                              | Pre-V1-tag security audit: secrets, sanitization, PII, data-residency | Unchanged                                        |
| SM-7      | Rate-Limit Sustainability | 250 complex turns / 8-hour session with 0 unhandled 429s           | RPD counter telemetry; session replay test                            | Unchanged (V2 parallel adds RPD pressure)        |

## 10. Implementation Roadmap

### 10.1 Day-0 Hard Prerequisites (All must complete before Week 1 code begins)

| #    | Action                                                                 | Acceptance Criteria                                                                                                                                                                                                                         | Owner    |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| D0-1 | Execute $10 OpenRouter deposit                                         | Account RPD ceiling confirmed at ~1,000 via /auth/key endpoint                                                                                                                                                                              | Solo Dev |
| D0-2 | Verify all required model endpoints :free (not preview) via API script | Script queries /api/v1/models; confirms: nemotron-3-super-120b-a12b:free, gemma-4-31b-it:free, qwen3-coder-480b-a35b:free, nemotron-nano-9b-v2:free, gpt-oss-120b:free; confirms deepseek-r1-0528:free absent; confirms zero :preview flags | Solo Dev |
| D0-3 | Provision PostgreSQL 16 + pgvector + deploy agent_memory schema        | SELECT * FROM agent_memory LIMIT 1; succeeds; HNSW index confirmed                                                                                                                                                                          | Solo Dev |
| D0-4 | Initialize TypeScript + deploy EmbeddingService singleton              | p95 embedding latency ≤ 50ms across 100 calls; heap ≤ 200MB post-load                                                                                                                                                                       | Solo Dev |
| D0-5 | Implement secrets vault + pre-commit credential scan                   | Literal API key commit triggers CI failure; vault confirmed loading key                                                                                                                                                                     | Solo Dev |
| D0-6 | Calibrate DALC collapse threshold                                      | Run 10 unconstrained Self-MoA persona exchanges; measure mean cosine; set collapseThreshold = min(measuredMean - 0.05, 0.85)                                                                                                                | Solo Dev |

### 10.2 V1 Phase Plan (6-Week Window)

| Phase                    | Week   | Deliverables                                                                                                                             | Exit Criteria                                                                                             |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Foundation               | Week 1 | All D0 actions complete; TypeScript project scaffold; AgentNode interface; EmbeddingService singleton; golden fixture set (≥ 20 prompts) | All 6 D0 checklist items confirmed; p95 embedding ≤ 50ms; fixture set reviewed by both personas           |
| Core Pipeline            | Week 2 | Router + Proposer + Aggregator roles operational; DALC module computing similarity; FR-01 through FR-06 implemented and tested           | E2E slice produces coherent responses on 5 test prompts; DALC triggers on injected high-similarity inputs |
| Halting + Verification   | Week 3 | RMoA delta convergence halting; Verifier with PoT oracle (vm.runInNewContext) + Zod schema + mathjs; FR-07 through FR-12 implemented     | Objective 1.1 met: 5 prompts < 10s; Verifier intercepts ≥ 95% of synthetic hallucinations                 |
| Persistence + Resilience | Week 4 | pgvector GRPO persistence; semantic cache; fetchWithBackoff; fallback chain; FR-13 through FR-22 complete                                | 250-turn session completes with 0 unhandled 429s; pg_dump backup confirmed                                |
| RTM + Hardening          | Week 5 | Full RTM (≥ 10 FRs + ≥ 5 NFRs → named acceptance tests); security audit; PII redaction; data-residency disclosure                        | Objective 1.2: 0 critical/major security findings; RTM 100% mapped                                        |
| Validation + V1 Tag      | Week 6 | Full golden fixture regression suite; SM-1 through SM-7 validated; all p95 SLOs confirmed; V1 tag cut                                    | All 7 Success Metrics confirmed; V1 tag + LICENSES.md + data-residency notice published                   |

### 10.3 V2 Migration Path (Post-V1)

| V2 Component                        | Migration Cost                                                                                                      | V1 Dependency                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Graph-of-Agents topology            | Add edge-construction function + relevance-ordering comparator; swap AgentNode.modelIdentifier to specialist models | AgentNode interface unchanged; EmbeddingService reused for DAG construction |
| Parallel Proposer Layer             | Add Node.js concurrency management; DALC comparison across N outputs                                                | AgentNode interface unchanged; DALC module extended                         |
| Symbolic-MoE Inter-Node Compression | Add SymbolicSerializer interface mapping Proposer output type to JSON schema / AST / constraint expression          | Requires GoA; ~44% runtime reduction (empirical validation required)        |
| Heterogeneous Model Pool            | Swap modelIdentifier per role to qwen3-coder (code), gemma-4 (logic), ling-2.6-flash (fast)                         | All routing logic reuses AgentNode interface; no core callModel rewrite     |
| AutoPDL Prompt Optimization         | Successive halving over prompt variants on golden fixture                                                           | Requires stable golden fixture from V1                                      |
| Full GRPO Branching                 | Comparative evaluation pipeline using reward_score from V1 write-backs                                              | Requires agent_memory schema from V1 (Should-Have)                          |

## 11. Appendix: Decision Log (ADR Summary)

All architectural decisions are final as of Blueprint v2.3. All prior versions of these decisions have been superseded. The table below is the authoritative ADR register for V1 implementation.

| ADR          | Decision                                                              | Rationale Summary                                                                                                                   | Status                 |
| ------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| ADR-001      | Self-MoA over heterogeneous topology for V1                           | +6.6 AlpacaEval delta; eliminates cross-distribution hallucination; single API schema; ~60% Node.js complexity reduction            | CLOSED                 |
| ADR-002      | Step 3.5 Flash permanently excluded                                   | Confirmed instability; rate-limit spoofing; deprecation April/May 2026                                                              | CLOSED — PERMANENT     |
| ADR-003      | nomic-embed-text-v1.5 as mandatory embedding model                    | 41.9ms CPU; ≤200MB RAM; 768-dim MRL; in-process Transformers.js v4; fully auditable training data                                   | CLOSED                 |
| ADR-004      | $10 OpenRouter deposit as technical constraint (Day-0)                | 200 RPD = 50 turns/day = session-breaking; deposit → ~1,000 RPD → 250 turns/day                                                     | CLOSED — MANDATORY     |
| ADR-005      | DALC enforcement as mandatory V1 feature                              | 0.888 cosine collapse guarantees shared-error amplification without enforcement; threshold ≤ 0.85 required                          | CLOSED                 |
| ADR-006      | RMoA delta-based halting replaces static stepCount                    | Reduces unnecessary token expenditure; static maxSteps = 10 retained as absolute ceiling                                            | CLOSED                 |
| ADR-007      | GoA + Symbolic-MoE designated as V2 architecture                      | GoA: ~50% TTFT reduction; Symbolic-MoE: ~44% runtime reduction via inter-node compression (validation required)                     | CLOSED — V2 SCOPE      |
| ADR-009      | Proposer T = 0.7 (0.6–0.8); Aggregator T = 0.2 (0.1–0.3)              | Low Proposer temp pre-collapses output before DALC; high Aggregator temp degrades synthesis determinism                             | CLOSED — CORRECTS v2.1 |
| ADR-010      | DeepSeek endpoint deprecated; GPT-OSS-120B as Fallback2               | deepseek-r1-0528:free absent from registry April 26, 2026; GPT-OSS-120B is 117.9B MoE optimized for agentic routing                 | CLOSED                 |
| ADR-011      | Extrinsic oracle wrapping mandatory for Verifier                      | Ungrounded self-critique degrades accuracy on deterministic tasks; raw oracle error must be injected verbatim                       | CLOSED                 |
| ADR-012      | hy3-preview:free rejected; ling-2.6-flash:free added as V2 candidate  | :preview suffix violates §6.1 hard constraint; ling-2.6-flash (104B/7.4B active) pending D0-2 verification                          | CLOSED                 |
| ADR-013      | Symbolic-MoE added to V2 migration path                               | GoA with N parallel Proposers creates O(N × response_length) Aggregator input without compression                                   | CLOSED — V2 SCOPE      |
| REJECTED-001 | npx --antigravity install sickn33/antigravity-awesome-skills rejected | (1) --antigravity is not a valid npx flag; (2) unverified third-party source with no npm provenance; (3) supply chain attack vector | REJECTED — PERMANENT   |

**PRD v1.0 — Derived from Blueprint v2.3 — April 2026**  
**Solo-Deployable MoA/MoE Hybrid Chatbot Framework**
```
