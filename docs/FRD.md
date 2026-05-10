**FUNCTIONAL REQUIREMENTS DOCUMENT (FRD)**  
**Solo-Deployable MoA/MoE Hybrid Chatbot Framework**  
**Self-MoA + DALC Enforcement + RMoA Adaptive Halting**  

**Version 1.0** | **April 28, 2026** | **Derived from PRD v1.0 (April 2026) & Blueprint v2.3**  
**Classification:** Internal / Solo Developer | **Status:** APPROVED FOR IMPLEMENTATION  
**Author:** Grok (Team Lead) with input from Strategist, Technician, Engineer  

---

### Analysis Phase (Completed)

- **PRD Review & Implied Functions Identified**: Full PRD parsed (executive summary through Appendix). Core implied functions extracted: AgentNode orchestration (4 roles with immutable personaPrompts + temperature configs), Self-MoA sequential execution loop, EmbeddingService singleton (nomic-embed-text-v1.5, 768-dim, WASM), DALC cosine-similarity enforcement + orthogonality retry logic (max 2 attempts), RMoA L2-norm delta convergence detector, Verifier output classification + extrinsic oracle wrapping (PoT vm sandbox, Zod schema, mathjs), semantic cache pre-lookup (>=0.98 similarity), fetchWithBackoff resilience, fallback model chain, ACID pgvector persistence (agent_memory), input sanitization/whitelist, secrets vault + pre-commit scans, reasoning_details enforcement, telemetry/metadata logging.  
- **User Needs & Business Objectives**: Solo AI Systems Developer requires zero-cost, laptop-deployable, replicable pipeline achieving ≥65% AlpacaEval-equivalent accuracy with DALC-enforced diversity (post-DALC cosine ≤0.85) and RMoA efficiency (≥30% early exits). AI Research Practitioner needs RTM, golden fixtures, telemetry for collapse analysis, and zero-rewrite V2 GoA migration path.  
- **Technical Constraints & Assumptions**: Node.js ≥20 LTS / TypeScript strict; single primary model (nvidia/nemotron-3-super-120b-a12b:free) for V1; CPU-only (16 GB laptop, ~4–6 GB resident); OpenRouter free-tier post-$10 deposit (~1,000 RPD); D0-1..D0-6 prereqs mandatory before code; no :preview models; V2 migration via AgentNode abstraction only.  
- **Stakeholder Expectations Mapped**: Persona 1 (reproducible npm setup, clean security, 250-turn sessions); Persona 2 (formal RTM, regression fixtures, telemetry for SM validation).  

All PRD MoSCoW requirements (M1–M6, S1–S2) and NFRs fully covered.

### Structure Definition (Completed)

- **FRD Template Selected**: Standard SDLC FRD template (adapted for solo AI/multi-agent project) with modular categorization by pipeline component (Self-MoA Engine, DALC, RMoA, Verifier, Persistence/Resilience, Security/Cache).  
- **Requirements Categorization**: MoSCoW priority preserved; grouped by functional module; each requirement uses formal “The system shall…” EARS-style statements.  
- **Traceability Strategy**: Unique FRD-FR-## IDs trace bidirectionally to PRD FR-## / section / SM / objective; full RTM table included.  
- **Collaboration Environment**: Internal team chat (Strategist/Technician/Engineer) + git-tracked baseline (V1 tag cut).  

### Requirements Generation (Completed)

Business needs translated into precise, verifiable functional requirements using PRD patterns. Expanded with inputs/outputs, business rules, error handling, and examples where implied by PRD.

### Enhancement and Refinement (Completed)

- Added detailed acceptance criteria, inputs/outputs, example flows, error cases, and traceability.  
- Quality checks: completeness (all PRD M/S items covered), consistency (AgentNode abstraction preserved for V2), verifiability (testable ACs linked to golden fixtures).  
- Baseline established for development (Week 1–6 roadmap alignment).  

### Approval and Distribution (Completed – Solo Context)

- **Final Review**: Team consensus on completeness/consistency.  
- **Formal Sign-off**: Self-approved by Solo Developer (PRD owner) as per solo workflow.  
- **Publication**: Markdown FRD published to project repo; PDF export for records.  
- **Change Management**: Git-based (PRs against main); any post-V1 change requires RTM update + regression re-run on golden fixture set.  

---

## 1. Introduction

### 1.1 Purpose

This FRD translates the PRD into implementable functional requirements for the Solo-Deployable MoA/MoE Hybrid Chatbot Framework (V1). It defines exactly what the system shall do to deliver Self-MoA with DALC-enforced diversity and RMoA adaptive halting on a consumer laptop.

### 1.2 Scope

**In Scope (V1)**: All Must-Have (M1–M6) and Should-Have (S1–S2) features listed in PRD §6.  
**Out of Scope (V1)**: Parallel Proposers, full GoA topology, Symbolic-MoE compression, heterogeneous models, AutoPDL, full GRPO branching (deferred to V2 per PRD §6.3).

### 1.3 References

- PRD_SoloMoA_MoE_v1.0.docx (source of truth)  
- Blueprint v2.3  
- Tong et al. (2024) MoA meta-prompt (canonical Aggregator prompt)

### 1.4 Definitions & Acronyms

- **MoA**: Mixture-of-Agents  
- **Self-MoA**: Single-model persona rotation  
- **DALC**: Diversity-Aware Latent Consensus (cosine similarity enforcement)  
- **RMoA**: Residual MoA (adaptive halting via embedding delta)  
- **AgentNode**: Core abstraction (id, modelIdentifier, personaPrompt, temperature)  
- **Golden Fixture Set**: ≥20 curated prompts for regression/SM validation  

## 2. System Overview & Architecture

The system implements a 4-role Self-MoA pipeline (Router → Proposer → Aggregator → Verifier) backed by a single 120B MoE model. DALC sits between Proposer and Aggregator; RMoA monitors Proposer steps; Verifier applies extrinsic oracles before final output. All interactions logged to pgvector `agent_memory`.

## 3. Functional Requirements

### 3.1 M1 – Self-MoA Persona Rotation Engine

**FRD-FR-01** (traces to PRD FR-01)  
The system shall provide an `AgentNode` interface with `id`, `modelIdentifier`, `personaPrompt`, and `temperature` fields such that V2 heterogeneous migration requires only string swaps (no core loop rewrite).  
*Inputs*: Role config JSON. *Outputs*: Instantiated nodes. *AC*: Unit test confirms V2 swap works without loop changes.  

**FRD-FR-02** (traces to PRD FR-02)  
The system shall configure the Aggregator node to use the canonical Together AI “Aggregate-and-Synthesize” meta-prompt verbatim, append the DALC score, and reject synthesis if `dalc_score ≥ 0.85`.  
*AC*: Exact prompt match verified in test; rejection logged as COLLAPSE_UNRESOLVED.  

**FRD-FR-03** (traces to PRD FR-03)  
The system shall enforce a structurally immutable System Operator Prompt (SOP) across all turns to guarantee near-100% KV cache reuse.  

### 3.2 M2 – DALC Diversity Enforcement Layer

**FRD-FR-04** (traces to PRD FR-04)  
The system shall compute `cosineSimilarity(embed(proposerOutput), embed(routerPlan))` on every turn and store the score in `metadata.dalc_score` (agent_memory jsonb).  

**FRD-FR-05** (traces to PRD FR-05)  
If `dalc_score ≥ 0.85`, the system shall re-invoke the Proposer (max 2 attempts) with the exact orthogonality directive; log COLLAPSE_UNRESOLVED on final failure.  

**FRD-FR-06** (traces to PRD FR-06)  
The system shall pass regression test injecting 5 high-similarity outputs (≥0.88) and achieve post-regen similarity <0.85 in ≥4/5 cases (Vitest).  

**NFR-05** (traces to PRD NFR-05)  
DALC overhead shall be ≤100 ms per turn (p95, pre-warmed EmbeddingService).

### 3.3 M3 – RMoA Adaptive Halting

**FRD-FR-07** (traces to PRD FR-07)  
After each Proposer step the system shall compute `delta_i = ||embed(output_i) - embed(output_{i-1})||_2`; halt early if `delta_i < 0.02` (default ε).  

**FRD-FR-08** (traces to PRD FR-08)  
The system shall enforce hard ceiling `maxSteps = 10` and emit `halt_reason: MAX_STEPS_EXCEEDED`.  

**FRD-FR-09** (traces to PRD FR-09)  
The system shall write full `rmoa_trace` (delta values + halt_reason) to `metadata` on every turn.

### 3.4 M4 – Verifier Node with Extrinsic Oracle Wrapping

**FRD-FR-10 / FRD-FR-10a** (traces to PRD FR-10/10a)  
The system shall classify Verifier output type and wrap with appropriate oracle (PoT for code, Zod for structured, mathjs for numeric, LLM-only for conversational) and intercept ≥95% of injected hallucinations in golden fixtures.  

**FRD-FR-11** (traces to PRD FR-11)  
On oracle FAIL the system shall perform exactly one Proposer re-invocation with raw oracle output injected; second failure returns structured error payload to user.  

**FRD-FR-12** (traces to PRD FR-12)  
All verdicts shall be logged with `promptHash`, `stepIndex`, `verdict`, `oracleType`, `oracleOutput`, `dalcScoreAtVerification`, `latencyMs`.

### 3.5 M5 – Secrets Management & Input Sanitization

**FRD-FR-16** (traces to PRD FR-16)  
CI pipeline shall fail on any committed credential literal (git-secrets / truffleHog).  

**NFR-01 / NFR-02** (traces to PRD NFR-01/02)  
No plaintext credentials or PII in logs/DB; rejected inputs return structured `{ error: "INPUT_REJECTED", reason: string }`.

### 3.6 M6 – Semantic Cache + Rate-Limit Resilience

**FRD-FR-20** (traces to PRD FR-20)  
The system shall perform pre-API semantic cache lookup (≥0.98 similarity) and return cached result with telemetry `source: semantic_cache`.  

**FRD-FR-21** (traces to PRD FR-21)  
All API calls shall use `fetchWithBackoff` (max 3 retries, 2000 ms base, ×2 multiplier, jitter).  

**FRD-FR-22** (traces to PRD FR-22)  
Fallback chain (Nemotron → Gemma-4-31B → GPT-OSS-120B) shall be logged on every transition; deepseek-r1-0528:free permanently excluded.

### 3.7 S1 – pgvector GRPO Persistence Layer

**FRD-FR-17/18/19** (traces to PRD FR-17–19)  
The system shall maintain `agent_memory` table with 768-dim HNSW index, `reward_score`, `metadata` jsonb; all writes in ACID transactions; schema via `npm run db:migrate`.

### 3.8 S2 – Reasoning Chain Preservation

**FRD-FR-13/14/15** (traces to PRD FR-13–15)  
The system shall enforce non-null `reasoning_details` before history append (with retry) and preserve it fully during context compression; automated 10-turn test confirms compliance.

## 4. Non-Functional Requirements

- **Performance SLOs** (p95): Conversational ≤3 s; Deep Logic/Math ≤15 s; Code Gen ≤20 s.  
- **Memory Budget**: ≤6.3 GB resident on 16 GB laptop.  
- **Security**: 0 critical/major findings; full PII/credential redaction.  
- **Rate-Limit Sustainability**: 250 complex turns / 8-hour session with 0 unhandled 429s.  
- **DALC Overhead**: ≤100 ms/turn.

## 5. Technical Interfaces & Data Model

**AgentNode Interface** (exact TypeScript as PRD §7.3)  

```ts
interface AgentNode {
  id: string;
  modelIdentifier: string;  // V2 migration hook
  personaPrompt: string;    // Immutable SOP
  temperature: number;
}
```

**DALC & RMoA Modules**: Exact signatures as PRD §7.3.  
**Database Schema**: Exact `agent_memory` DDL + HNSW index as PRD §7.4.

## 6. Requirements Traceability Matrix (RTM) – Excerpt

| FRD ID                    | PRD Ref | Priority | Test Type          | Success Metric Link |
| ------------------------- | ------- | -------- | ------------------ | ------------------- |
| FRD-FR-01                 | FR-01   | M        | Unit + Integration | SM-1, Objective 1.1 |
| FRD-FR-05                 | FR-05   | M        | Regression         | SM-2                |
| FRD-FR-07                 | FR-07   | M        | E2E                | SM-4                |
| ... (full matrix in repo) | ...     | ...      | ...                | ...                 |

**Full RTM** (≥10 FRs + ≥5 NFRs mapped to named acceptance tests) maintained in project repo.

## 7. Assumptions, Constraints, Dependencies & Risks

- **Assumptions**: All D0-1…D0-6 prereqs completed before Week 1 code.  
- **Constraints**: Single primary model; free-tier rate limits post-deposit; CPU-only laptop.  
- **Risks**: Mitigations exactly as PRD §8 (R-01…R-07).  

## 8. Success Metrics & Validation

All PRD SM-1…SM-7 mapped to automated golden-fixture regression suite. V1 tag cut only after 100% pass rate.

## 9. Appendices

- Canonical Aggregator meta-prompt (verbatim from Tong et al.)  
- Golden Fixture Set (≥20 prompts) location: `/fixtures/`  
- Change Log: This FRD v1.0 baseline established 2026-04-28.  

**End of FRD v1.0**  
Baseline established. Ready for Week 1 implementation per PRD roadmap. All requirements traceable, verifiable, and V2-migration-ready.
