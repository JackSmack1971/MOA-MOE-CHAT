**BUSINESS REQUIREMENTS DOCUMENT (BRD)**  
**Solo-Deployable MoA/MoE Hybrid Chatbot Framework**  
**Self-MoA + DALC Enforcement + RMoA Adaptive Halting**  

**Version 1.0** | **April 28, 2026** | **Derived from PRD v1.0 & FRD v1.0 (April 2026) and Blueprint v2.3**  
**Classification:** Internal / Solo Developer | **Status:** APPROVED FOR IMPLEMENTATION  
**Prepared by:** Grok (Team Lead) with Strategist, Technician, and Engineer  

---

### Document Control

- **Version History**  
  
  | Version | Date       | Author      | Changes                  |
  | ------- | ---------- | ----------- | ------------------------ |
  | 1.0     | 2026-04-28 | Grok (Team) | Initial BRD from PRD/FRD |

- **Approvals**  
  Solo Developer (PRD Owner) – Approved  

- **Distribution**  
  Project repository (git-tracked); PDF export for records.

---

### 1. Executive Summary

#### 1.1 Business Problem or Opportunity

Solo AI systems developers and AI research practitioners currently face fundamental limitations in deploying high-performance multi-agent reasoning systems. Single-model chatbots cannot optimize across reasoning, code generation, and conversational domains simultaneously. Existing Self-MoA implementations suffer from **representational collapse** (measured mean pairwise cosine similarity of **0.888** in chain-of-thought embedding space), causing majority-voting synthesis to amplify shared errors rather than correct them. Heterogeneous MoA architectures introduce cross-distribution hallucination amplification.

This results in fragile accuracy, session-interrupting rate-limit cascades (free-tier 200 RPD = ~50 turns/day), and lack of deterministic verification for code, structured outputs, or mathematics.

#### 1.2 Proposed Solution Overview

The **Solo-Deployable MoA/MoE Hybrid Chatbot Framework** delivers a self-hardening, ACID-compliant Self-MoA pipeline using a single top-tier 120B Mixture-of-Experts model (**NVIDIA Nemotron 3 Super 120B-A12B:free** via OpenRouter).  

It orchestrates four formalized agent roles (**Router, Proposer, Aggregator, Verifier**) with:

- **Diversity-Aware Latent Consensus (DALC)** – enforces output diversity (post-DALC cosine similarity ≤ 0.85).
- **Residual MoA (RMoA)** – adaptive halting via L2-norm embedding delta (≥30% early-exit rate).
- **Extrinsic oracle wrapping** in Verifier (Program-of-Thought sandbox, Zod schemas, mathjs) for deterministic verification.

The entire system runs on a **CPU-only consumer laptop** with zero ongoing infrastructure cost (one-time $10 OpenRouter deposit unlocks ~1,000 RPD ≈ 250 complex turns/day).

#### 1.3 Key Objectives and Success Criteria

**V1 Targets (PRD §1.4 & §9):**

- Self-MoA Accuracy (AlpacaEval 2.0 equivalent): ≥65% (matches heterogeneous MoA baseline).
- Post-DALC Cosine Similarity: ≤0.85 (target <0.80).
- Verifier Hallucination Interception: ≥95%.
- RMoA Early-Exit Rate: ≥30% of prompts.
- Daily Turn Capacity: 250 complex turns with 0 unhandled 429s.
- Full RTM, golden fixture regression suite, and zero-rewrite V2 GoA migration path.

#### 1.4 Strategic Alignment and Value Proposition

Enables **enterprise-grade multi-agent reasoning** for solo developers without capital expenditure. Delivers replicable, open-weight architecture with formal traceability, telemetry for collapse analysis, and clear V2 evolution path to Graph-of-Agents (GoA) topology.

**Business Value:** Productivity multiplier for solo AI engineers and researchers; eliminates high-cost heterogeneous MoA complexity while matching or exceeding baseline accuracy.

---

### 2. Project Background

#### 2.1 Business Context and Environment

Solo developers and independent AI researchers require high-accuracy, multi-agent cognitive pipelines but operate under severe constraints: CPU-only laptops, free-tier API inference, and no dedicated GPU infrastructure. Current market offerings force a choice between fragile single-model performance and expensive/complex heterogeneous MoA.

#### 2.2 Current State Assessment

- Unconstrained Self-MoA exhibits **0.888 cosine similarity** collapse → error amplification.
- Heterogeneous MoA suffers cross-distribution hallucination.
- Free-tier rate limits break long sessions.
- Verification relies on ungrounded LLM self-critique.
- No formal specifications or regression fixtures for reproducible research.

#### 2.3 Market and Industry Analysis

Target market: Solo AI systems developers and AI research practitioners (PRD Personas 1 & 2). Competitive landscape (PRD §5) shows clear differentiation via **Self-MoA + DALC** in the single-model quadrant, achieving accuracy parity with lower cost and complexity.

#### 2.4 Project Drivers and Justification

- Quantitative evidence from Blueprint v2.3 and Tong et al. (2024).
- Enables **zero-rewrite V2 migration** to GoA topology.
- Critical for replicable, auditable AI research (golden fixtures, telemetry, RTM).

---

### 3. Project Scope and Objectives

#### 3.1 In-Scope and Out-of-Scope Elements

**In Scope (V1 – PRD §6.1–6.2 & FRD §1.2):**  
All Must-Have (M1–M6) and Should-Have (S1–S2) features: Self-MoA engine, DALC, RMoA, Verifier with oracles, persistence, semantic cache, rate-limit resilience, security, reasoning preservation.

**Out of Scope (V1 – PRD §6.3):**  
Parallel Proposers, full GoA topology, Symbolic-MoE compression, heterogeneous models, AutoPDL, full GRPO branching, multi-user sessions (deferred to V2/Post-PoC).

#### 3.2 SMART Business Objectives

(Directly from PRD §3.3)

| Objective                 | Metric                              | Target                      | Timeline              |
| ------------------------- | ----------------------------------- | --------------------------- | --------------------- |
| E2E pipeline operational  | 5 test prompts → coherent responses | <10s per turn               | Week 3 of 6           |
| Security posture          | Critical/major findings             | 0                           | Before first API call |
| RTM complete              | FRs + NFRs mapped to tests          | ≥10 FRs + ≥5 NFRs           | Week 2                |
| DALC effectiveness        | Post-DALC similarity                | ≤0.85                       | V1 tag                |
| Rate-limit sustainability | 8-hour session                      | 250 turns, 0 unhandled 429s | V1 tag                |

#### 3.3 Project Success Criteria and KPIs

Mapped to PRD Success Metrics (SM-1 through SM-7) and validated via automated golden-fixture regression suite.

#### 3.4 Constraints and Assumptions

- CPU-only 16 GB laptop (~4.1–6.3 GB resident memory budget).
- Single primary model (Nemotron 3 Super 120B-A12B:free); D0-1..D0-6 prerequisites mandatory.
- OpenRouter free-tier post-$10 deposit.
- Assumption: All Day-0 actions complete before Week 1 code.

---

### 4. Stakeholder Analysis

#### 4.1 Stakeholder Identification Matrix

(Expanded from PRD §4 Personas)

| Stakeholder                                                | Role                  | Interest                                  | Influence | Engagement Strategy                     |
| ---------------------------------------------------------- | --------------------- | ----------------------------------------- | --------- | --------------------------------------- |
| Solo AI Systems Developer (Persona 1)                      | End user / developer  | Zero-cost, reproducible, secure pipeline  | High      | Direct implementation; npm setup        |
| AI Research Practitioner / Benchmark Evaluator (Persona 2) | End user / researcher | RTM, fixtures, telemetry, reproducibility | High      | Golden fixture suite + regression tests |
| Solo Developer (Project Owner)                             | Decision maker        | On-time V1 delivery, V2 migration path    | High      | Self-governance via roadmap & ADRs      |
| OpenRouter (API Provider)                                  | External dependency   | Rate-limit compliance                     | Medium    | D0-2 verification + fallback chain      |

#### 4.2 Roles and Responsibilities

- **Solo Developer**: All implementation, testing, deployment.
- **Team (Grok + Strategist + Technician + Engineer)**: Requirements analysis, BRD/FRD alignment, traceability.

#### 4.3 Communication and Engagement Plan

- Git-tracked artifacts, daily D0 checklist, weekly roadmap checkpoints.
- Formal RTM and regression suite for validation.

#### 4.4 Governance Structure

Solo context: Decision log maintained as ADR register (PRD Appendix). All architectural decisions finalized in Blueprint v2.3.

---

### 5. Business Process Analysis

#### 5.1 Current State (As-Is) Processes

Standard Self-MoA or single-model workflows suffer sequential persona rotation without diversity enforcement → representational collapse (0.888 cosine) → error amplification in Aggregator. No adaptive halting, no extrinsic verification → hallucinated outputs reach user. Rate-limit fragility interrupts sessions.

#### 5.2 Future State (To-Be) Processes

**High-level pipeline (Self-MoA with DALC + RMoA + Verifier):**

```mermaid
flowchart TD
    A[User Query] --> B[Router AgentNode]
    B --> C[Proposer AgentNode <br/>(multiple steps)]
    C --> D{DALC Check}
    D -->|similarity ≥ 0.85| E[Orthogonality Retry <br/>(max 2)]
    D -->|PASS| F[Aggregator AgentNode]
    F --> G[Verifier with Oracles <br/>(PoT/Zod/mathjs)]
    G -->|PASS| H[Final Response + Telemetry]
    G -->|FAIL| C
    C --> I[RMoA Delta Check <br/>δ < ε → Early Exit]
    I -->|Halt| F
```

**Key Optimizations:**

- DALC between Proposer & Aggregator.
- RMoA monitors convergence after each Proposer step.
- Verifier applies extrinsic oracles per query class.
- Semantic cache + fetchWithBackoff + fallback chain.
- ACID persistence to `agent_memory` (pgvector).

#### 5.3 Gap Analysis

- **Eliminated:** Representational collapse, ungrounded verification, rate-limit cascades.
- **Optimized:** Context window usage via RMoA; KV-cache hit rate via immutable SOP.

#### 5.4 Process Metrics and Opportunities

- TTFT reduction target (V2): ~50%.
- Early-exit rate: ≥30%.
- Hallucination interception: ≥95%.

---

### 6. Business Requirements

#### 6.1 Business Rules and Policies

- Enforce DALC diversity threshold (≤0.85 cosine) on every turn.
- Extrinsic oracle verification mandatory for code/structured/math outputs.
- Immutable System Operator Prompt (SOP) for KV-cache efficiency.
- No plaintext credentials/PII in logs or DB (NFR-01/02).

#### 6.2 Functional Requirements (High-Level)

Mapped from PRD MoSCoW → FRD (full traceability in §11.2).

**Core Business Requirements:**

- **BR-01:** Orchestrate 4-role Self-MoA pipeline (Router → Proposer → Aggregator → Verifier).
- **BR-02:** Enforce DALC diversity enforcement layer.
- **BR-03:** Implement RMoA adaptive halting (delta-based + hard ceiling).
- **BR-04:** Provide Verifier with extrinsic oracles.
- **BR-05:** Ensure semantic cache, rate-limit resilience, and fallback chain.
- **BR-06:** Maintain ACID persistence and reasoning chain integrity.

#### 6.3 Non-Functional Requirements

- Performance SLOs (p95): Conversational ≤3s, Deep Logic ≤15s, Code Gen ≤20s.
- Memory: ≤6.3 GB resident.
- Security: 0 critical/major findings; input sanitization.
- Scalability: 250 complex turns / 8-hour session.

#### 6.4 Data Requirements and Information Flows

- **agent_memory** table (768-dim embeddings, metadata jsonb with dalc_score, rmoa_trace, reward_score).
- Telemetry: promptHash, stepIndex, verdict, oracleType, latencies, etc.

**Traceability:** Full Requirements Traceability Matrix (RTM) maintained in repo (excerpt in FRD §6; ≥10 FRs + ≥5 NFRs mapped to acceptance tests).

---

### 7. Solution Architecture Overview

#### 7.1 Conceptual Architecture

Single-model Self-MoA pipeline with embedded DALC/RMoA modules and oracle-wrapped Verifier. AgentNode abstraction enables zero-rewrite V2 GoA migration.

#### 7.2 System Components and Integrations

- Inference: OpenRouter API (primary + fallback chain).
- Embedding: nomic-embed-text-v1.5 (WASM, 768-dim).
- DB: PostgreSQL 16 + pgvector (HNSW index).
- Runtime: Node.js 20+ / TypeScript (strict).
- Oracles: vm.runInNewContext (PoT), Zod, mathjs.

#### 7.3 Data Architecture

See PRD §7.4 exact `agent_memory` DDL.

#### 7.4 Technical Constraints and Dependencies

- Day-0 prerequisites (D0-1 to D0-6) mandatory.
- CPU-only laptop constraints.
- No :preview models; deepseek-r1-0528:free permanently excluded.

---

### 8. Implementation Considerations

#### 8.1 Phasing and Release Strategy

**6-Week V1 Roadmap** (PRD §10.2) with explicit Day-0 hard prerequisites.

**V2 Migration Path** (PRD §10.3): AgentNode interface + DALC/RMoA modules reused; only modelIdentifier swaps + edge construction required.

#### 8.2 Change Management Approach

- Git-based; PRs against main.
- Regression suite on golden fixtures.
- ADR register for all decisions.

#### 8.3 Training and Support Requirements

- Self-documenting via RTM, fixtures, and telemetry.
- npm install + db:migrate for reproducibility.

#### 8.4 Operational Transition Planning

- Cron-based pg_dump backups.
- Semantic cache + backoff for production-grade resilience.

---

### 9. Risk Assessment

#### 9.1 Risk Identification and Classification

(Directly from PRD §8 Risk Matrix – high-fidelity extraction)

| Risk ID | Risk                            | Severity | Likelihood | Mitigation                          |
| ------- | ------------------------------- | -------- | ---------- | ----------------------------------- |
| R-01    | DALC re-generation success <80% | HIGH     | MEDIUM     | Threshold tuning + temp delta       |
| R-02    | Free-tier endpoint removal      | HIGH     | LOW        | Fallback chain + daily verification |
| R-03    | Embedding latency overrun       | MEDIUM   | MEDIUM     | Benchmark + quantization fallback   |
| R-04    | PoT sandbox escape              | HIGH     | LOW        | Strict vm constraints               |
| ...     | (Full matrix in PRD §8)         | ...      | ...        | ...                                 |

**Notable:** Supply-chain risk (R-08) permanently eliminated via ADR-REJECTED-001.

#### 9.2 Mitigation Strategies, Monitoring, and Compliance

- All mitigations owned by Solo Developer.
- Continuous regression testing on golden fixtures.
- Security audit before first API call.

---

### 10. Financial Analysis

#### 10.1 Cost-Benefit Analysis

- **Costs:** One-time $10 OpenRouter deposit; developer time (6-week solo window); negligible compute (CPU laptop).
- **Benefits:** 250 complex turns/day (5× uplift from unfunded baseline); accuracy parity with heterogeneous MoA at zero ongoing cost; productivity gains for solo developers/researchers; reusable V2 foundation.

#### 10.2 Total Cost of Ownership (TCO)

Extremely low: <$10 + laptop electricity. No GPU, no cloud instances.

#### 10.3 Return on Investment (ROI)

High qualitative ROI via:

- Elimination of commercial MoA complexity/cost.
- Replicable research infrastructure.
- Future V2 GoA efficiency gains (~50% TTFT reduction).

#### 10.4 Budget Allocation

N/A (solo internal project). Deposit funded from personal account.

---

### 11. Glossary and Appendices

#### 11.1 Glossary of Terms

- **DALC:** Diversity-Aware Latent Consensus (cosine similarity enforcement).
- **RMoA:** Residual MoA (delta-based adaptive halting).
- **Self-MoA:** Single-model persona rotation.
- **AgentNode:** Core abstraction interface.
- **Golden Fixture Set:** ≥20 curated prompts for regression/validation.
- (Full list in PRD §1.4 Definitions & FRD §1.4)

#### 11.2 Requirements Traceability Matrix (RTM) – Summary

Full RTM maintained in project repository. Excerpt (FRD §6):

| FRD ID    | PRD Ref | Priority | Test Type  | Linked SM |
| --------- | ------- | -------- | ---------- | --------- |
| FRD-FR-01 | FR-01   | M        | Unit/Int   | SM-1      |
| FRD-FR-05 | FR-05   | M        | Regression | SM-2      |
| FRD-FR-07 | FR-07   | M        | E2E        | SM-4      |
| ...       | ...     | ...      | ...        | ...       |

#### 11.3 Reference Documents

- PRD v1.0, FRD v1.0, Blueprint v2.3.
- Tong et al. (2024) MoA meta-prompt (canonical).
- ADR Register (PRD Appendix).

#### 11.4 Supporting Materials

- Golden Fixture Set: `/fixtures/`
- Canonical Aggregator meta-prompt (verbatim).
- Database schema, TypeScript interfaces (exact from PRD §7.3).

#### 11.5 Document Control & Appendices

- All prior blueprint versions superseded.
- Change management: Git-based with RTM updates.

---

**End of BRD v1.0**  
**Next Steps Recommendation:**  

1. Confirm completeness with Solo Developer.  
2. Proceed to Week 1 Foundation phase (D0-1..D0-6).  
3. Maintain RTM and regression suite as living artifacts.  

This BRD serves as the single source of truth for business alignment and provides full traceability to product (PRD) and functional (FRD) requirements. All informational gaps were resolved via direct extraction or logical inference from provided documents; no external clarification required.  

Ready for implementation per the 6-week roadmap.
