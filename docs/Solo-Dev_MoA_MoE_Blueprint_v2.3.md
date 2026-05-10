# Project Blueprint: Solo-Deployable MoA/MoE Hybrid Chatbot Framework
**Version:** 2.3
**Date:** 2026-04-27
**Prepared For:** AI Agent Swarm (Initial Processing by @orchestrator-project-initialization)
**Human Contact:** [Placeholder: Project Lead, contact@example.com]

> **v2.3 Change Summary:** Four requested surgical edits; three applied, one partially applied with one sub-instruction rejected. **(Edit 1) Verifier hardened with extrinsic oracles** — FR-10 updated to require Program-of-Thought external execution and Zod schema oracle wrapping; deterministic tool output provides the Proposer revision signal, replacing pure LLM self-critique. **(Edit 2, partial) V2 model pool updated** — `inclusionai/ling-2.6-flash:free` (104B total, 7.4B active) added as V2 parallel Proposer candidate; `tencent/hy3-preview:free` **rejected** — `:preview` flag directly violates the hard constraint in §6.1 and ADR-001 (preview models excluded from all routing paths; blueprint §3.2 documents the systemic collapse risk when preview windows close); D0-2 validation script targeting clarified. **(Edit 3) Symbolic-MoE routing added to V2 migration path** — context window bottleneck from response concatenation formally addressed in §3.2 and ADR-007; 44% runtime reduction figure noted with empirical validation caveat. **(Edit 4, partial) Enterprise scaling note added** — `vLLM` (PagedAttention) and `TensorRT-LLM` documented as enterprise inference scaling options; `npx --antigravity install sickn33/antigravity-awesome-skills` **rejected and flagged** — `--antigravity` is not a valid `npx` flag; `sickn33/antigravity-awesome-skills` is an unverified third-party source with no npm registry provenance; embedding an unvetted external install command in an executable specification is a supply chain risk and has been removed (see §v2.3 Rejected Instructions log).
>
> **v2.2 → v2.3 Topology Decision:** All prior architectural decisions unchanged. This version hardens Verifier implementation, expands V2 model candidates, adds Symbolic-MoE to the V2 path, and documents enterprise scaling infrastructure.

---

## 1. Introduction & Vision

### 1.1. Project Overview

The Solo-Deployable MoA/MoE Hybrid Chatbot Framework is a single-user, proof-of-concept conversational AI system that orchestrates a single top-tier Mixture-of-Experts model — NVIDIA Nemotron 3 Super 120B — through a **Self-Mixture-of-Agents (Self-MoA)** architecture with formalized Router, Proposer, Aggregator, and Verifier roles. To mitigate the representational collapse inherent to same-model persona rotation, the system enforces output diversity via the **Diversity-Aware Latent Consensus (DALC)** protocol before the Aggregator synthesis step. The system targets solo software developers who require enterprise-grade multi-agent reasoning without capital expenditure on dedicated GPU infrastructure, deployable entirely on a CPU-only consumer laptop via zero-cost free-tier API inference.

### 1.2. Problem Statement / Opportunity

Single-model chatbot deployments cannot simultaneously optimize across reasoning, code generation, and conversational retrieval domains. Naive heterogeneous Mixture-of-Agents synthesizers introduce cross-distribution hallucination amplification when different-architecture models critique each other's outputs. However, Self-MoA implementations are not exempt from collapse risk: empirical diagnostics confirm that same-model persona outputs exhibit a mean pairwise cosine similarity of 0.888 in chain-of-thought embedding space — mathematically guaranteeing that majority-voting synthesis amplifies shared errors rather than correcting them unless explicit diversity enforcement is applied. The April 2026 ecosystem makes it possible to mitigate both failure modes simultaneously: Self-MoA eliminates cross-distribution friction, and DALC enforcement enforces the output orthogonality required for a reliable Aggregator synthesis step — all within the zero-cost, CPU-only, single-API-key deployment envelope.

### 1.3. Core Vision

To deliver a self-hardening, ACID-compliant Self-MoA cognitive pipeline — with DALC-enforced output diversity and RMoA-based adaptive halting — architected from Day 0 for migration to a Graph-of-Agents topology, that any solo developer can instantiate on a consumer laptop, validate against a golden fixture set, and extend without rewriting the core execution loop.

---

## 2. Project Goals & Objectives

### 2.1. Strategic Goals

- **Goal 1:** Demonstrate that a DALC-enforced Self-MoA topology applied to a single 120B MoE model — with formalized Router, Proposer, Aggregator, and Verifier roles — achieves ≥ 65% accuracy on the AlpacaEval 2.0 benchmark equivalent (matching the known 6-proposer heterogeneous MoA baseline), while operating within free-tier rate limits on a CPU-only consumer laptop.
- **Goal 2:** Establish a replicable open-weight-only architecture, deployable via a single OpenRouter API key and a Node.js/TypeScript environment, with no proprietary model dependencies on the critical path and a formally validated requirements traceability matrix.
- **Goal 3:** Architect the `AgentNode` interface abstraction and DALC pipeline from Day 0, ensuring the V1 Self-MoA codebase migrates to a Graph-of-Agents topology (V2) by swapping `modelIdentifier` strings and adding edge-construction logic — without rewriting the core execution loop.

### 2.2. Specific Objectives (V1 / Initial Release)

- **Objective 1.1:** Deliver a functioning E2E pipeline slice — User → Router persona → Proposer persona (tool call) → DALC diversity check → Aggregator persona (synthesis) → Verifier persona (intercept) → final output — in which 5 representative test prompts produce coherent, reasoning-chain-preserved responses in under 10 seconds, within 3 weeks of project start.
- **Objective 1.2:** Achieve zero critical or major open security findings: secrets vault integration, pre-commit credential scanning, input sanitization, and data-residency disclosure implemented before any external API call leaves the local environment.
- **Objective 1.3:** Produce a formal Requirements Traceability Matrix (RTM) mapping each of the ≥10 functional requirements and ≥5 non-functional requirements to named acceptance tests, with all Day-0 infrastructure actions (§12) verified complete before Week 2 begins.

---

## 3. Scope

### 3.1. In Scope (Key Deliverables & Functionalities for V1)

- **Self-MoA Persona Rotation Engine (Router / Proposer / Aggregator / Verifier):** Four `AgentNode` instances — Router, Proposer, Aggregator, Verifier — all backed by `nvidia/nemotron-3-super-120b-a12b:free`, each with a distinct `personaPrompt` and `temperature`. A single `callModel` function iterates through roles sequentially per turn, modifying only the `role: "system"` block while keeping the shared SOP context immutable to maximize KV cache hit rates. The Aggregator role carries the highest synthesis responsibility (success coefficient 0.588 per empirical regression analysis) and receives the explicit meta-prompt to critically evaluate, contrast, and synthesize the Proposer output against the DALC diversity report.

- **DALC Diversity Enforcement Layer:** Before the Aggregator synthesis step, the Diversity-Aware Latent Consensus module computes the pairwise cosine similarity between the Proposer output embedding and the Router's initial routing plan embedding. If the similarity score exceeds a configurable collapse threshold (default: 0.85), the Proposer is re-invoked with an explicit orthogonality directive before synthesis proceeds. This prevents the documented 0.888 mean similarity collapse from contaminating the Aggregator's input space.

- **In-Process Embedding Routing Layer:** `nomic-embed-text-v1.5` (137M parameters) loaded via `@huggingface/transformers` v4 as a singleton `EmbeddingService` with `dtype: 'q8'` and `device: 'wasm'`, computing 768-dimensional MRL task-requirement vectors in ≤42ms on CPU with ≤200MB resident memory — no Python daemon, no external network call. The same service doubles as the DALC similarity calculator and the semantic cache lookup engine.

- **RMoA Adaptive Halting (with hard ceiling):** Replacing the static `stepCount` circuit breaker, the Residual MoA halting mechanism computes the informational delta between the current Proposer output embedding and the previous layer's output embedding. If `|delta_i - delta_{i-1}|` falls below the convergence threshold `ε` (configurable, default: 0.02), the loop halts early and the current Aggregator output is promoted to final. A hard absolute ceiling of `maxSteps = 10` is retained as a belt-and-suspenders upper bound to prevent runaway token expenditure regardless of delta convergence.

- **Verifier Node Interception:** The Verifier `AgentNode` sits downstream of the Aggregator and upstream of the user-facing output. It issues structured `PASS` / `FAIL` / `UNCERTAIN` verdicts, enforces the hard `maxSteps` ceiling, and emits all verdicts to structured JSON telemetry.

- **Secrets Management & Input Sanitization Layer:** API key in local vault (`dotenv-vault` or OS keychain); `git-secrets` / `truffleHog` pre-commit scan in CI; all user inputs whitelist-sanitized before tool schema injection.

- **pgvector GRPO Persistence Layer:** PostgreSQL 16+ with `pgvector`; `agent_memory` table with 768-dim HNSW index (`vector_cosine_ops`), `reward_score`, DALC similarity scores stored in `metadata jsonb`; all write-backs in `BEGIN`/`COMMIT` transactions; automated daily `pg_dump` backup.

- **Semantic Cache + Rate-Limit Resilience Layer:** Pre-API-call cosine lookup (threshold ≥ 0.98 → cache return); exponential backoff with random jitter; fallback chain: Nemotron → `google/gemma-4-31b-it:free` → `openai/gpt-oss-120b:free`.

- **Telemetry & Latency Instrumentation:** Per-endpoint RPM/RPD counters; p95 TTFT per query class; DALC similarity scores and delta convergence values logged per turn; `pino` structured JSON with PII redaction; SLO alert on 3 consecutive breaches.

### 3.2. Out of Scope (For V1)

- **Parallel Proposer Layer:** Deploying multiple Proposer instances simultaneously (true parallel generation as specified in foundational MoA literature) is deferred to V2. RPD math: 2 parallel Proposers = 5 req/turn = 200 complex turns/day at 1,000 RPD — borderline acceptable, but the additional Node.js concurrency management and DALC comparison overhead across N outputs is incompatible with the 6-week solo-developer window. V2 parallel proposers will use the same `AgentNode` interface.

- **Graph-of-Agents (GoA) Topology:** GoA is the designated V2 architecture. Execution algorithm: (1) **Node sampling** — dynamically select the most relevant agents based on domain-specific model cards using the existing `EmbeddingService` relevance comparator; (2) **DAG construction** — build directed edges ordered by relevance score; (3) **Directed message passing** — forward pass from highest-relevance agents to lowest-relevance agents; (4) **Reverse message passing** — backward refinement pass; (5) **Graph pooling** — aggregate final node states into synthesized output. Empirical evidence confirms 3-agent GoA outperforms 6-agent linear baselines and reduces complex-query execution time from ~240s to ~100s (~50% TTFT reduction). V2 migration requires: (a) an edge-construction function alongside the existing `AgentNode` interface, (b) a relevance-ordering comparator using the existing `EmbeddingService`. No core execution loop rewrite required.

- **Symbolic-MoE Adaptive Routing (V2, alongside GoA):** Standard GoA and parallel Proposer architectures introduce a **Context Window Bottleneck**: concatenating N multi-paragraph Proposer responses before Aggregator synthesis exponentially inflates the input token count, increasing both latency and the risk of context truncation during long sessions. V2 MUST implement Symbolic-MoE adaptive skill-based routing as a mitigation. Rather than passing full natural-language Proposer responses between nodes, Symbolic-MoE compresses intermediate outputs into structured symbolic representations (typed JSON schemas, AST fragments, or formal constraint expressions) that capture the semantic payload without the natural language overhead. Full natural-language synthesis is reserved exclusively for the final Aggregator step. This approach is projected to reduce parallel execution runtime by approximately 44% compared to standard full-text concatenation protocols. *(Caveat: the 44% figure is a reported empirical result from the Symbolic-MoE methodology literature; it must be validated against the specific V2 model configuration and average prompt lengths before adoption as a hard planning target.)*

- **Structural Model Diversity (Heterogeneous Topology):** Blending dense networks (Llama 3) with sparse MoE models (Mixtral 8x22B) and coding specialists is a V3+ consideration. DALC enforcement within Self-MoA is the V1 substitute that fits operational constraints.

- **Step 3.5 Flash Integration:** Permanently excluded — confirmed instability, rate-limit spoofing, deprecation April/May 2026.

- **AutoPDL / Successive Halving Prompt Optimization:** Deferred to V2.

- **Full GRPO Branching and Comparative Evaluation:** V2. V1 delivers schema, write-back, fixture seeding, and `reward_score` update on positive feedback.

- **Multi-User / Concurrent Sessions, Production Cloud Deployment:** Post-PoC.

---

## 4. Target Users & Audience

- **Primary User Persona 1: Solo AI Systems Developer**
  - *Needs:* Zero-cost multi-agent reasoning; reproducible local environment from `npm install` + `npm run db:migrate`; Zod-validated API contracts; DALC similarity scores in telemetry to diagnose collapse events.
  - *Pain Points:* Heterogeneous MoA collapses under cross-distribution hallucination amplification; Self-MoA without diversity enforcement amplifies shared errors at 0.888 cosine correlation; free-tier 429 cascades interrupt sessions without circuit breakers.

- **Primary User Persona 2: AI Research Practitioner / Benchmark Evaluator**
  - *Needs:* Reproducible Self-MoA + DALC experiments; golden fixture regression suite for accuracy delta measurement vs. standard MoA baselines; DALC similarity and delta-convergence logs for collapse analysis.
  - *Pain Points:* Published MoA blueprints lack formal specifications; mathematical formulas embedded as unrenderable image blobs; no test plans or acceptance criteria for independent reproduction.

---

## 5. Core Features & High-Level Requirements (V1)

### 5.1. Feature: Self-MoA Persona Rotation Engine (Router → Proposer → Aggregator → Verifier)

- **Description:** Four `AgentNode` instances, all targeting `nvidia/nemotron-3-super-120b-a12b:free`, execute sequentially per turn. The **Router** classifies intent and constructs the routing plan. The **Proposer** generates the domain-specific solution with reasoning mode active. The **Aggregator** — the highest-criticality role (empirical success coefficient: 0.588) — meta-prompts to critically evaluate the Proposer output against the DALC report and synthesizes the final response. The **Verifier** intercepts the Aggregator output before user delivery.
- **High-Level Requirements / User Stories:**
  - FR-01: The persona rotation engine MUST implement the `AgentNode` interface (`id`, `modelIdentifier`, `personaPrompt`, `temperature`) such that adding a parallel Proposer (V2) or swapping any node to a heterogeneous model requires changing only `modelIdentifier` and `personaPrompt`.
  - FR-02: The Aggregator `personaPrompt` MUST use the following canonical `Aggregate-and-Synthesize` instruction template verbatim as its core directive — this is the exact prompt proven to achieve the 65.1% AlpacaEval 2.0 baseline in the Together AI MoA implementation (Tong et al., 2024): *"You have been provided with a set of responses from various open-source models to the latest user query. Your task is to synthesize these responses into a single, high-quality response. It is crucial to critically evaluate the information provided in these responses, recognizing that some of it may be biased or incorrect. Your response should not simply replicate the given answers but should offer a refined, accurate, and comprehensive reply to the instruction."* In V1 Self-MoA, the "responses from various open-source models" are the Proposer outputs generated by persona-rotated instances of the same Nemotron model; the Aggregator is not informed of this, and the prompt remains valid and must not be paraphrased. Additionally, the Aggregator `personaPrompt` MUST append: (a) the DALC similarity score for the current turn, and (b) an explicit instruction to reject synthesis if `dalc_score ≥ 0.85`.
  - FR-03: The system prompt (SOP context block) MUST remain structurally immutable across all turns within a session; no dynamic elements MAY appear before the user query, preserving near-100% KV prefix cache match.
- **Priority:** Must-Have

### 5.2. Feature: DALC Diversity Enforcement Layer

- **Description:** The Diversity-Aware Latent Consensus module sits between the Proposer and the Aggregator. It embeds both the Proposer's output and the Router's routing plan using the existing `EmbeddingService`, computes their pairwise cosine similarity, and enforces a re-generation directive if the similarity score exceeds the collapse threshold. This directly addresses the documented 0.888 mean pairwise cosine similarity of same-model persona outputs.
- **High-Level Requirements / User Stories:**
  - FR-04: The DALC module MUST compute `cosineSimilarity(embed(proposerOutput), embed(routerPlan))` on every turn using the in-process `EmbeddingService`; the similarity score MUST be written to `metadata.dalc_score` in the `agent_memory` row for that turn.
  - FR-05: If `dalc_score ≥ collapseThreshold` (default: 0.85), the DALC module MUST issue a re-generation directive to the Proposer with an explicit orthogonality instruction: *"Your prior response was semantically identical to the routing plan. Provide a structurally distinct solution exploring an alternative approach."* A maximum of 2 re-generation attempts per turn is permitted before the Aggregator proceeds with the best available output and logs `{ dalc_status: 'COLLAPSE_UNRESOLVED' }`.
  - FR-06: A regression test MUST inject 5 known high-similarity Proposer outputs (similarity ≥ 0.88) and assert that DALC triggers re-generation in all 5 cases; post-regeneration similarity MUST fall below 0.85 in ≥ 4 of 5 cases.
  - NFR-05 (Performance): The DALC similarity computation (two embedding calls + cosine calculation) MUST add ≤ 100ms overhead per turn, utilizing the pre-warmed `EmbeddingService` singleton.
- **Priority:** Must-Have

### 5.3. Feature: RMoA Adaptive Halting

- **Description:** Replaces the v2.0 static `stepCount` circuit breaker with a Residual MoA convergence detector that monitors the informational delta between successive Proposer output embeddings. When the delta falls below a convergence threshold, the loop halts early — reducing unnecessary token expenditure and API calls without sacrificing output quality.
- **High-Level Requirements / User Stories:**
  - FR-07: The halting module MUST compute `delta_i = ||embed(output_i) - embed(output_{i-1})||_2` (L2 norm of embedding difference) after each Proposer invocation; if `delta_i < ε` (default: `0.02`), the loop MUST exit early and the current Aggregator output MUST be promoted to final.
  - FR-08: A hard absolute ceiling `maxSteps = 10` MUST terminate the loop regardless of delta convergence state, emitting `{ halt_reason: 'MAX_STEPS_EXCEEDED', stepCount: n }` to telemetry — retaining the safety guarantee of the prior static circuit breaker.
  - FR-09: Both the delta value and the halt reason (`CONVERGED` / `MAX_STEPS_EXCEEDED` / `VERIFIER_FAIL`) MUST be written to `metadata.rmoa_trace` in the `agent_memory` row per turn, enabling post-session convergence analysis.
- **Priority:** Must-Have

### 5.4. Feature: Verifier Node Interception

- **Description:** The Verifier `AgentNode` sits downstream of the Aggregator and upstream of the user-facing output. It evaluates structural coherence, flags hallucinated action plans, enforces the `maxSteps` hard ceiling, and emits structured verdicts to telemetry. With DALC enforcement upstream, the Verifier's input space is guaranteed to be diversity-filtered.
- **High-Level Requirements / User Stories:**
  - FR-10: The Verifier MUST NOT rely solely on LLM self-critique for objective logic verification — empirical evidence demonstrates that ungrounded self-critique degrades accuracy on deterministic tasks without external feedback signals. The Verifier MUST wrap its LLM generation in at least one extrinsic, deterministic oracle appropriate to the query class:
    - **Code outputs:** Execute generated code via a Program-of-Thought (PoT) subprocess (e.g., Node.js `vm.runInNewContext` sandbox or a spawned Python interpreter) and capture the stdout/stderr as the objective error signal. The exact runtime error output MUST be injected back into the Proposer's revision prompt verbatim — not paraphrased.
    - **Structured outputs:** Validate the Proposer's JSON/object output against the relevant Zod schema before synthesis dispatch. Schema validation errors MUST be serialized and returned as the Proposer revision signal.
    - **Logic/math outputs:** The Verifier MAY use a symbolic evaluator (e.g., `mathjs` expression parser) to check numerical assertions in the Proposer output against stated constraints.
    - In all cases, the `FAIL` verdict payload MUST include the raw oracle error output under `{ verdict: 'FAIL', oracleOutput: string, oracleType: 'POT_EXECUTION' | 'ZOD_SCHEMA' | 'SYMBOLIC_EVAL' | 'LLM_ONLY' }`. `LLM_ONLY` is permitted solely for open-ended conversational outputs where no deterministic oracle applies.
  - FR-10a: The Verifier (with extrinsic oracle active) MUST intercept ≥ 95% of synthetic hallucinated responses in the golden-answer regression fixture before output delivery. The regression fixture MUST include at least 5 code-output test cases where the PoT oracle catches a runtime error that pure LLM self-critique would have passed.
  - FR-11: On `FAIL`, the Verifier MUST trigger one Proposer re-invocation with the raw oracle error output injected as the revision signal; if the second attempt also fails Verifier + oracle check, the Verifier MUST return a structured error to the user with `{ verdict: 'FAIL', oracleOutput: string, oracleType: string }`.
  - FR-12: All verdicts MUST be logged with fields: `promptHash`, `stepIndex`, `verdict`, `oracleType`, `oracleOutput`, `dalcScoreAtVerification`, `latencyMs`.
  - FR-12: All verdicts MUST be logged with fields: `promptHash`, `stepIndex`, `verdict`, `flaggedReason`, `dalcScoreAtVerification`, `latencyMs`.
- **Priority:** Must-Have

### 5.5. Feature: Reasoning Chain Preservation Across Multi-Turn Sessions

- **Description:** The Proposer's `reasoning_details` array is captured on every invocation and appended as explicit context to conversation history, ensuring unbroken logical continuity across turns.
- **High-Level Requirements / User Stories:**
  - FR-13: The Proposer `AgentNode` execute function MUST assert `reasoning_details` is non-null before appending to history; if null, a single retry with explicit `reasoning: true` MUST fire before the turn is marked failed.
  - FR-14: Context compression MUST preserve `reasoning_details` segments in full; only assistant prose sections MAY be compressed; compression ratio logged per turn.
  - FR-15: An automated test MUST assert `reasoning_details` non-null across a simulated 10-turn session for all 5 E2E slice prompts (Objective 1.1).
- **Priority:** Must-Have

### 5.6. Feature: Secrets Management & Input Sanitization

- **Description:** API credentials in a local vault with pre-commit scanning; user inputs through a whitelist sanitization layer before any tool dispatch.
- **High-Level Requirements / User Stories:**
  - FR-16: CI pipeline MUST fail on any committed credential literal detected by `git-secrets` or `truffleHog` on every commit and PR.
  - NFR-01 (Security): No API key, session token, or PII MUST appear in any log, telemetry record, or database column in plaintext.
  - NFR-02 (Security): User input strings MUST pass whitelist filter before tool schema injection; rejected inputs return `{ error: 'INPUT_REJECTED', reason: string }`.
- **Priority:** Must-Have

### 5.7. Feature: pgvector GRPO Persistence Layer

- **Description:** PostgreSQL 16+ with `pgvector` as unified relational and vector store. The `agent_memory` schema stores SOPs, golden fixtures, GRPO reward scores, and per-turn DALC + RMoA trace metadata in a single ACID-compliant table.
- **High-Level Requirements / User Stories:**
  - FR-17: Production schema MUST match:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE agent_memory (
        id           bigserial  PRIMARY KEY,
        content      text       NOT NULL,
        metadata     jsonb,           -- stores: dalc_score, rmoa_trace, halt_reason
        embedding    vector(768),
        reward_score numeric    DEFAULT 0.0,
        created_at   timestamp  DEFAULT current_timestamp
    );

    CREATE INDEX ON agent_memory
        USING hnsw (embedding vector_cosine_ops);
    ```
  - FR-18: Every GRPO write-back MUST execute in a single `BEGIN`/`COMMIT` transaction; exceptions trigger full `ROLLBACK` with no partial state.
  - FR-19: Schema bootstrappable via `npm run db:migrate`; integration test MUST simulate mid-transaction failure and assert rollback.
  - NFR-03 (Reliability): Daily `pg_dump` via `cron` to `./backups/`; restore test included in integration suite.
- **Priority:** Should-Have

### 5.8. Feature: Semantic Cache + Rate-Limit Resilience Layer

- **Description:** Pre-API-call semantic lookup bypasses OpenRouter on cache hits ≥ 0.98 cosine similarity; exponential backoff with jitter handles 429/502; deterministic fallback chain ensures session continuity.
- **High-Level Requirements / User Stories:**
  - FR-20: Semantic cache lookup MUST execute before every `callModel` invocation; similarity ≥ 0.98 triggers cache return with `{ source: 'semantic_cache' }` telemetry flag.
  - FR-21: All API calls MUST use `fetchWithBackoff`: max 3 retries, base 2000ms, ×2 multiplier, 0–500ms random jitter.
  - FR-22: Fallback chain MUST be: `nvidia/nemotron-3-super-120b-a12b:free` → `google/gemma-4-31b-it:free` → `openai/gpt-oss-120b:free`; each fallback logged with `{ event: 'FALLBACK_TRIGGERED', fromModel, toModel, reason }`. Note: `deepseek/deepseek-r1-0528:free` was removed from the active OpenRouter free-tier registry as of April 26, 2026 and MUST NOT be referenced in any routing logic. `openai/gpt-oss-120b:free` (117.9B params, 5.1B active per forward pass, 131K context, agentic-routing-optimized) is the designated Fallback2 replacement.
- **Priority:** Must-Have

---

## 6. Critical Constraints & Assumptions

### 6.1. Constraints

**Technical:**
- All inference endpoints MUST use open-weight models with no `preview` flag via OpenRouter. Proprietary closed-weight models prohibited on critical path.
- **Step 3.5 Flash permanently excluded** — rate-limit spoofing, instability, confirmed April/May 2026 deprecation.
- Runtime: Node.js ≥ v20 LTS, TypeScript strict mode. No Python backend in V1.
- All mathematical specifications MUST be expressed as TypeScript or LaTeX fenced code blocks. Base64 PNG image blobs prohibited in all specification artifacts.
- Embedding model MUST run in-process via `@huggingface/transformers` v4, `dtype: 'q8'`, `device: 'wasm'` — ≤42ms p95, no GPU, no external call.
- **DALC collapse threshold MUST be set to ≤ 0.85** (strictly below the documented 0.888 mean similarity of unconstrained Self-MoA outputs); this threshold is a required configuration value, not an optional tuning parameter.

**Operational:**
- **A $10 OpenRouter deposit is a mandatory Day-0 technical prerequisite.** Unfunded: 20 RPM / 200 RPD global (all models share one bucket) = 50 MoA turns/day — unsustainable. Post-deposit: ~1,000 RPD = 250 turns/day with the 4-role linear pipeline (4 req/turn).
- Free-tier rate limits (20 RPM, ~1,000 RPD post-deposit) are a hard operational ceiling.
- V1 MUST be deployable on a consumer-grade laptop (≥16GB RAM, CPU-only) within 6 weeks.

**Memory Budget (16GB Total):**

| Component | Estimated Resident Memory |
|---|---|
| `nomic-embed-text-v1.5` (q8 WASM) | ~200 MB |
| PostgreSQL 16 daemon | ~500–750 MB |
| Node.js orchestrator application | ~150–300 MB |
| OS + IDE + browser | ~3–5 GB |
| **Total estimated** | **~4.1–6.3 GB** |
| **Available headroom** | **~9.7–11.9 GB** |

**Legal / Compliance:**
- All models MUST carry Apache 2.0 or equivalent permissive license; documented in `LICENSES.md`.
- Data-residency notice MUST be displayed on first run (all queries transit OpenRouter proxy).

**Performance SLOs (p95, per query class):**

| Query Class | Role(s) Activated | p95 Target |
|---|---|---|
| Conversational | Router → Proposer → Aggregator | ≤ 3 seconds |
| Deep Logic / Math | Router → Proposer (reasoning mode) → DALC → Aggregator → Verifier | ≤ 15 seconds |
| Code Generation | Router → Proposer (low temp) → DALC → Aggregator → Verifier | ≤ 20 seconds |

### 6.2. Assumptions

- OpenRouter free-tier endpoints for `nvidia/nemotron-3-super-120b-a12b:free`, `google/gemma-4-31b-it:free`, `qwen/qwen3-coder-480b-a35b:free`, `nvidia/nemotron-nano-9b-v2:free`, and `openai/gpt-oss-120b:free` remain available throughout the 6-week V1 window. Verified on Day 0 before any code is written.
- The $10 OpenRouter deposit is approved and executable on Day 0.
- A manually curated golden fixture set of ≥20 labeled prompts (math, code, conversational) is completable during Week 1 Day 1 alongside environment setup.
- Automatic KV prefix caching is active on all four target endpoints and remains active provided the `personaPrompt` SOP block stays immutable across turns.
- DALC re-generation success rate (post-regeneration similarity < 0.85) is ≥ 80%, based on the general principle that an explicit orthogonality directive to the same model substantially shifts the output distribution; if empirical testing reveals a lower success rate, the collapse threshold `ε` MUST be tightened and/or a second Proposer invocation with an increased temperature delta MUST be added.

---

## 7. Technology Stack

### Mandatory

| Component | Technology | Version / Config |
|---|---|---|
| Inference Gateway | OpenRouter Unified API | `https://openrouter.ai/api/v1` |
| Agent SDK | `@openrouter/agent` | Latest stable |
| Schema Validation | `zod` | Latest stable |
| Embedding Model | `nomic-embed-text-v1.5` | `dtype: 'q8'`, `device: 'wasm'` |
| Embedding Runtime | `@huggingface/transformers` | v4 (ONNX/WASM) |
| Vector + Relational DB | PostgreSQL 16+ with `pgvector` | HNSW, `vector_cosine_ops`, 768-dim |
| Structured Logging | `pino` | With PII field redaction config |
| Secrets Management | `dotenv-vault` or OS keychain | Pre-commit `git-secrets` scan enforced |
| Runtime | Node.js | ≥ v20 LTS, TypeScript strict mode |
| Testing | `vitest` + `supertest` | Unit, integration, E2E |
| PoT Oracle Sandbox | Node.js `vm.runInNewContext` | Isolated execution for code Verifier; no network access permitted inside sandbox |
| Symbolic Evaluator | `mathjs` | Expression parsing for numeric assertion verification in Verifier |

> **Enterprise Scaling Note (Post-PoC / Out of V1 Scope):** The V1 architecture runs exclusively on CPU via WASM and OpenRouter's federated free tier, requiring no local GPU. When this architecture is scaled to multi-user production deployments requiring local inference, the massive KV cache pressure from multi-turn MoA sessions will require highly optimized inference servers. The two industry-standard solutions are: **`vLLM`** (utilizing PagedAttention to eliminate KV cache fragmentation and prevent catastrophic Out-Of-Memory faults under concurrent load) and **`TensorRT-LLM`** (NVIDIA's compiler-optimized inference engine for maximum throughput on A100/H100 hardware). Neither is required or relevant for the 16GB CPU-only V1 deployment.

### `AgentNode` Roles (V1 — Self-MoA, Single-Model)

| AgentNode Role | Model Identifier | Temperature | Responsibility |
|---|---|---|---|
| **Router** | `nvidia/nemotron-3-super-120b-a12b:free` | 0.7 | Intent classification, routing plan generation |
| **Proposer** | `nvidia/nemotron-3-super-120b-a12b:free` | **0.7** (default; range 0.6–0.8) | Domain solution generation with reasoning mode; high temperature enforces generative diversity and broad latent-space search before DALC check; subject to DALC re-invocation |
| **Aggregator** | `nvidia/nemotron-3-super-120b-a12b:free` | **0.2** (default; range 0.1–0.3) | Deterministic synthesis via canonical `Aggregate-and-Synthesize` meta-prompt; low temperature enforces structural rigidity; highest-criticality role (success coeff 0.588) |
| **Verifier** | `nvidia/nemotron-3-super-120b-a12b:free` | 0.2 | Output coherence check, RMoA hard ceiling enforcement |

### V2 Role Expansion (GoA + Parallel Proposers)

```typescript
// V1: all four AgentNode instances share modelIdentifier
// V2 (GoA): swap Proposer to heterogeneous specialist models:
//   { id: 'proposer-code',  modelIdentifier: 'qwen/qwen3-coder-480b-a35b:free',   temperature: 0.7 }
//   { id: 'proposer-logic', modelIdentifier: 'google/gemma-4-31b-it:free',          temperature: 0.7 }
//   { id: 'proposer-fast',  modelIdentifier: 'inclusionai/ling-2.6-flash:free',     temperature: 0.7 }
//     ↑ 104B total / 7.4B active — token-efficient parallel node sampling candidate
//       ⚠ Verify presence in free-tier registry on D0-2 before writing routing logic against it
// Add graph edge-construction function using existing EmbeddingService
// No core callModel execution loop rewrite required
```

> **⚠ Rejected V2 Candidate — `tencent/hy3-preview:free`:** This model was proposed as a V2 agentic routing candidate. It is excluded from all V1 and V2 routing paths because its `:preview` suffix directly violates the hard constraint in §6.1 (*"All inference endpoints MUST use open-weight models with no `preview` flag"*) and ADR-001. The blueprint's own §3.2 analysis (carried from v1.0) documents why preview-tier dependencies cause systemic collapse when the preview window closes. If Tencent Hy3 transitions to a stable, non-preview `:free` endpoint in a future registry update, it may be reconsidered at that time.

### Fallback Chain

```
Primary:   nvidia/nemotron-3-super-120b-a12b:free
Fallback1: google/gemma-4-31b-it:free
Fallback2: openai/gpt-oss-120b:free        ← replaces deepseek/deepseek-r1-0528:free (deprecated April 2026)
```

> **Note:** `qwen/qwen3-coder:free` (480B total, 35B active) is an acceptable alternative Fallback2 if `openai/gpt-oss-120b:free` is unavailable, but it should NOT appear in both the fallback chain and the V2 Proposer specialist role simultaneously.

### `AgentNode` Interface

```typescript
interface AgentNode {
    id: string;
    modelIdentifier: string;  // Single string swap enables V2 heterogeneous migration
    personaPrompt: string;    // Immutable SOP block — no dynamic elements permitted
    temperature: number;
}
```

### DALC Module (TypeScript Specification)

```typescript
interface DALCResult {
    similarity: number;       // Cosine similarity between proposerOutput and routerPlan embeddings
    status: 'PASS' | 'COLLAPSE_DETECTED' | 'COLLAPSE_UNRESOLVED';
    regenerationAttempts: number;
}

// Invoked between Proposer output and Aggregator input
async function enforceDALC(
    proposerOutput: string,
    routerPlan: string,
    collapseThreshold: number = 0.85,
    maxRegenerations: number = 2
): Promise<DALCResult>
```

### RMoA Halting Module (TypeScript Specification)

```typescript
interface RMoAHaltDecision {
    shouldHalt: boolean;
    delta: number;            // L2 norm of embedding difference between current and prior output
    haltReason: 'CONVERGED' | 'MAX_STEPS_EXCEEDED' | 'NOT_HALTED';
    stepCount: number;
}

// Invoked after each Proposer invocation
function checkConvergence(
    currentOutputEmbedding: number[],
    previousOutputEmbedding: number[],
    epsilon: number = 0.02,
    currentStep: number,
    maxSteps: number = 10
): RMoAHaltDecision
```

### Prefix Caching — Implementation Notes

All four target endpoints use **automatic KV cache deduplication** — no explicit `cache_control` header required. Developer obligation: keep all `AgentNode.personaPrompt` SOP blocks structurally immutable across turns. Extended TTL (`"ttl": "1h"`) supported.

### To Be Confirmed at Project Start (Day-0)

- Verify all five target model endpoints are `:free` (not preview-flagged) at `https://openrouter.ai/models/?q=free` before any code begins.
- Confirm `qwen/qwen3-coder-480b-a35b:free` queue wait times ≤ 60s; if not, promote `openai/gpt-oss-120b:free` to Fallback1 and demote Gemma accordingly.

---

## 8. Success Metrics (For V1)

- **SM-1 (Self-MoA + DALC Accuracy):** DALC-enforced Self-MoA achieves ≥ 65% accuracy on the 20-prompt golden fixture set — matching the known 6-proposer heterogeneous MoA AlpacaEval 2.0 baseline of 65.1%. Measured by the automated RTM test suite.

- **SM-2 (DALC Effectiveness):** Post-DALC mean pairwise cosine similarity of Proposer outputs across the fixture set MUST be ≤ 0.85 (target: < 0.80), demonstrating measurable diversity improvement from the baseline 0.888 unconstrained similarity.

- **SM-3 (Verifier Efficacy):** Verifier intercepts ≥ 95% of injected hallucinated responses in the regression suite before output delivery.

- **SM-4 (RMoA Efficiency):** RMoA early-exit triggers on ≥ 30% of fixture prompts before reaching `maxSteps = 10`, reducing average turn cost without degrading accuracy below SM-1 threshold.

- **SM-5 (Latency SLOs Met):** All three p95 latency targets (§ 6.1) satisfied across a synthetic load test of 20 representative prompts per query class, including DALC overhead.

- **SM-6 (Security Posture Clean):** Zero critical or major open security findings across credential management, input sanitization, PII logging, and data-residency disclosure before the V1 tag is cut.

- **SM-7 (Rate-Limit Sustainability):** A simulated 8-hour session (250 complex turns) completes within the post-deposit ~1,000 RPD ceiling with zero unhandled 429 errors, as validated by RPD counter telemetry.

**V2 Benchmark Targets (GoA Architecture — for planning reference):**
- GoA with 3 optimally selected agents from a structurally diverse pool, using a frontier MoE base model (e.g., Llama 4 Maverick, ~400B MoE): target **≥ 88–90% MMLU**, **≥ 92% HumanEval**.
- Prior targets (78% MMLU, 84% HumanEval) were derived from a 7–8B small-model demonstration pool in the investigation report — correct as a lower-bound demonstration but not as planning targets for a frontier-model GoA.
- GoA latency target: ~100s for complex multi-step queries (vs. ~240s for a sequential 6-agent linear MoA pipeline — approximately 50% TTFT reduction via dynamic subgraph selection and elimination of redundant agent invocations).
- These targets require structural model diversity (heterogeneous Proposer nodes from distinct architecture families), parallel Proposer execution, and dynamic DAG construction — all V2 scope items.

---

## 9. Key Stakeholders

- **Project Sponsor:** [Placeholder: Solo Developer / Independent Researcher]
- **Product Owner:** [Placeholder: Solo Developer — responsible for golden fixture curation, $10 deposit execution, DALC threshold calibration, and acceptance criteria sign-off]
- **Lead Developer / Swarm Overseer:** [Placeholder: AI Systems Architect — TypeScript implementation, pgvector schema, DALC + RMoA modules, telemetry instrumentation, CI pipeline]

---

## 10. Existing Resources & Documentation

- `MoA_MoE_Hybrid_Chatbot_Blueprint.md` (v1.0) — Source technical essay; model selection rationale and benchmark data. *Mathematical formulas must be converted from base64 PNG blobs to LaTeX/ASCII — resolved in v2.0.*
- `Solo-Dev_MoA_MoE_Framework_Investigation.md` — Closes OQ-1 through OQ-5; provides `EmbeddingService`, `fetchWithBackoff`, `AgentNode` interface, and pgvector DDL.
- *Architectural Discrepancies & Blueprint Revisions* engineering review — Closes OQ-8 through OQ-11; delivers four surgical corrections: DeepSeek endpoint deprecation, temperature hyperparameter alignment, canonical Aggregator meta-prompt, GoA benchmark revision.
- Audit Report (v1 coverage 38/100) — 8-item action plan; serves as V1 requirements backlog.
- OpenRouter API Docs — `https://openrouter.ai/docs`
- OpenRouter Agent SDK — `https://openrouter.ai/announcements/agent-sdk-with-callmodel`

---

## 11. Open Questions & Research Areas

> **Status: All open questions CLOSED as of v2.1.** No new open questions for V1.

| # | Original Question | Resolution | Source |
|---|---|---|---|
| OQ-1 | Embedding model for CPU ≤50ms | `nomic-embed-text-v1.5` (137M, 41.9ms, 768-dim MRL, ≤200MB) | Investigation §1 |
| OQ-2 | Prefix caching mechanics | Automatic for all target endpoints; keep `personaPrompt` immutable; `"ttl": "1h"` available | Investigation §2 |
| OQ-3 | Rate limits + sustainability | 200 RPD unfunded → 50 turns/day unsustainable; $10 deposit → ~1,000 RPD → 250 turns/day. Step 3.5 Flash excluded. | Investigation §3 |
| OQ-4 | Self-MoA vs. heterogeneous | Self-MoA is V1 architecture (+6.6 AlpacaEval, KV cache, 60% complexity reduction); DALC mitigates 0.888 collapse risk | Investigation §4 + Analysis §1 |
| OQ-5 | pgvector vs. LanceDB/Chroma | pgvector confirmed; HNSW <5ms at 10k vectors; ACID mandatory for GRPO | Investigation §5 |
| OQ-6 | Self-MoA collapse at 0.888 similarity | DALC enforcement (threshold ≤ 0.85, orthogonality re-generation) mitigates in V1; GoA + structural diversity in V2 | Analysis §1 |
| OQ-7 | GoA vs. linear pipeline | GoA (3-agent, ~240s→~100s) is V2 target; linear Self-MoA retained for V1 constraints | Analysis §3 |
| OQ-8 | DeepSeek endpoint availability | `deepseek-r1-0528:free` absent from registry April 26, 2026; replaced by `openai/gpt-oss-120b:free` | Review §V1 |
| OQ-9 | Optimal Proposer/Aggregator temperatures | Proposer T ∈ [0.6, 0.8] (diversity); Aggregator T ∈ [0.1, 0.3] (determinism) per Self-MoA Li et al. (2025) | Review §V2 |
| OQ-10 | Aggregator meta-prompt specification | Canonical Together AI `moa.py` `Aggregate-and-Synthesize` template; verbatim use required | Review §V3 |
| OQ-11 | V2 GoA benchmark targets | 88–90% MMLU, 92%+ HumanEval with frontier MoE (Llama 4 Maverick class); ~100s complex-query latency | Review §V4 |

---

## 12. Day-0 Action Checklist

> Hard prerequisites. No V1 development proceeds until all are confirmed complete.

| # | Action | Acceptance Criteria | Owner |
|---|---|---|---|
| D0-1 | **Execute $10 OpenRouter deposit** | Account RPD ceiling confirmed at ~1,000 via `/auth/key` endpoint | Solo Dev |
| D0-2 | **Verify all required model endpoints `:free` (not preview) via API script** | Script targets `https://openrouter.ai/api/v1/models`, filters by `id` field, and asserts presence of: `nemotron-3-super-120b-a12b:free`, `gemma-4-31b-it:free`, `qwen3-coder-480b-a35b:free`, `nemotron-nano-9b-v2:free`, `gpt-oss-120b:free`. Optionally checks for `ling-2.6-flash:free` (V2 candidate — absence is non-blocking for V1). Confirms `deepseek-r1-0528:free` absent (expected). Confirms zero `:preview` flags in the active registry for any endpoint in the routing logic. | Solo Dev |
| D0-3 | **Provision PostgreSQL 16 + pgvector + deploy `agent_memory` schema** | `SELECT * FROM agent_memory LIMIT 1;` succeeds; HNSW index confirmed | Solo Dev |
| D0-4 | **Initialize TypeScript + deploy `EmbeddingService` singleton** | p95 embedding latency ≤ 50ms across 100 calls; heap ≤ 200MB post-load | Solo Dev |
| D0-5 | **Implement secrets vault + pre-commit credential scan** | Literal API key commit triggers CI failure; vault confirmed loading key | Solo Dev |
| D0-6 | **Calibrate DALC collapse threshold** | Run 10 unconstrained Self-MoA persona exchanges; measure mean cosine similarity; set `collapseThreshold` to `min(measuredMean - 0.05, 0.85)` | Solo Dev |

---

## Appendix A: Closed Architectural Decisions

**ADR-001 — Self-MoA over Heterogeneous Topology for V1**
- *Decision:* V1 uses `nvidia/nemotron-3-super-120b-a12b:free` for all four `AgentNode` roles.
- *Rationale:* +6.6 AlpacaEval accuracy delta; eliminates cross-distribution hallucination amplification; single API schema; near-100% KV prefix cache hit; ~60% Node.js complexity reduction; `AgentNode` abstraction enables V2 migration.
- *Residual risk:* 0.888 cosine similarity collapse — mitigated by ADR-005 (DALC).

**ADR-002 — Step 3.5 Flash Permanently Excluded**
- *Decision:* `stepfun/step-3.5-flash:free` excluded from all routing paths.
- *Rationale:* Confirmed instability, rate-limit spoofing, deprecation April/May 2026. Conversational role absorbed by Nemotron Router persona.

**ADR-003 — `nomic-embed-text-v1.5` as Mandatory Embedding Model**
- *Decision:* `nomic-embed-text-v1.5` (137M, ONNX/WASM, q8) is the sole embedding model for V1.
- *Rationale:* Optimal equilibrium: 41.9ms CPU, ≤200MB RAM, 768-dim MRL, in-process Transformers.js v4, fully auditable training data. Doubles as DALC similarity calculator and semantic cache engine.
- *Rejected:* `EmbeddingGemma-300m` (>60ms), `Qwen3-Embedding-0.6B` (>80ms, capitalization instability), `all-MiniLM-L6-v2` (384-dim insufficient resolution).

**ADR-004 — $10 OpenRouter Deposit as Technical Constraint**
- *Decision:* $10 deposit is a hard Day-0 technical prerequisite.
- *Rationale:* 200 RPD = 50 turns/day = session-breaking at normal dev pace. $10 → ~1,000 RPD → 250 turns/day. No deposited credit consumed (all models remain zero-cost).

**ADR-005 — DALC Enforcement as Mandatory V1 Feature**
- *Decision:* Diversity-Aware Latent Consensus module is mandatory, not optional, in the Proposer → Aggregator pipeline.
- *Rationale:* Empirical measurement shows unconstrained same-model persona outputs exhibit mean pairwise cosine similarity of 0.888 — mathematically sufficient to guarantee majority-voting synthesis amplifies shared errors. DALC enforces re-generation below 0.85 threshold. This directly contradicts the v2.0 Goal 1 claim that Self-MoA "eliminates representational collapse" — that claim is removed and replaced with "mitigates via DALC enforcement."
- *V2 upgrade:* Structural model diversity (heterogeneous Proposers) + GoA topology supersedes DALC as the primary collapse mitigation.

**ADR-006 — RMoA Delta-Based Halting Replaces Static stepCount**
- *Decision:* RMoA informational delta convergence (`ε = 0.02`) replaces static `stepCount` as the primary halting mechanism; static `maxSteps = 10` retained as hard absolute ceiling.
- *Rationale:* Delta-based halting reduces unnecessary token expenditure when outputs converge before the ceiling, lowering per-session RPD consumption. The static ceiling ensures the safety guarantee of the prior circuit breaker is not degraded.

**ADR-007 — Graph-of-Agents and Symbolic-MoE Designated as V2 Target Architecture**
- *Decision:* GoA with dynamic DAG construction is the V2 architecture target. Symbolic-MoE adaptive routing is a mandatory V2 companion to GoA, addressing the context window bottleneck GoA introduces.
- *Execution algorithm (GoA):* (1) Node sampling via `EmbeddingService` domain-card relevance scoring; (2) DAG construction — directed edges built in relevance order; (3) Forward message passing — highest-relevance to lowest-relevance agents; (4) Reverse message passing — iterative backward refinement; (5) Graph pooling — final state aggregation.
- *Symbolic-MoE mandate:* Intermediate Proposer outputs between GoA nodes MUST be compressed into structured symbolic representations (typed JSON schemas, AST fragments, formal constraint expressions) before inter-node passing. Full natural-language synthesis is reserved for the final Aggregator step only. This mitigates the context window explosion from concatenating N multi-paragraph outputs. Projected runtime reduction: ~44% vs. standard full-text concatenation. *(Empirical validation against V2 model configuration required before adopting as a hard planning target.)*
- *Performance targets (V2, frontier MoE base):* ≥ 88–90% MMLU, ≥ 92% HumanEval using a model of the Llama 4 Maverick class (~400B MoE). Complex-query latency: ~100s (vs. ~240s for 6-agent linear MoA — ~50% TTFT reduction via dynamic subgraph selection).
- *Benchmark note:* Prior targets of 78% MMLU / 84% HumanEval (from v2.1) were derived from a 7–8B demonstration pool; they are correct as lower-bound figures but understate the achievable ceiling for a frontier-model GoA configuration.
- *Deferred from V1 because:* Dynamic DAG construction and Symbolic-MoE inter-node compression add concurrency management complexity incompatible with a 6-week solo-developer window.
- *V2 migration cost:* Add edge-construction function + relevance-ordering comparator + symbolic output serializer; swap `AgentNode.modelIdentifier` to heterogeneous specialists; no core `callModel` loop rewrite.

**ADR-009 — Proposer/Aggregator Temperature Correction (Self-MoA Hyperparameter Alignment)**
- *Decision:* Proposer temperature set to `T = 0.7` (range 0.6–0.8); Aggregator temperature set to `T = 0.2` (range 0.1–0.3).
- *Rationale:* v2.1 specified Proposer temperature of 0.1 for code generation. This directly contradicts Self-MoA's mathematical premise (Li et al., 2025): low-temperature Proposer outputs are near-deterministic, producing high cosine similarity before DALC even executes — forcing DALC to fight against a pre-collapsed input rather than catching residual collapse. High-temperature Proposer (0.6–0.8) forces broad latent-space exploration and genuine proposal diversity. Low-temperature Aggregator (0.1–0.3) enforces deterministic, structurally rigid synthesis — appropriate for the highest-criticality role (success coefficient 0.588). The prior temperature pair (Proposer 0.1, Aggregator 0.4) was internally inconsistent: too constrained at generation, too loose at synthesis.
- *Note:* Temperature is a per-turn runtime parameter on the `AgentNode`; recalibration does not require schema or interface changes.

**ADR-010 — DeepSeek Endpoint Deprecation and Fallback Chain Update**
- *Decision:* `deepseek/deepseek-r1-0528:free` removed from fallback chain; replaced by `openai/gpt-oss-120b:free` as Fallback2.
- *Rationale:* `deepseek/deepseek-r1-0528:free` confirmed absent from the active OpenRouter free-tier registry as of April 26, 2026. Replacement rationale: `openai/gpt-oss-120b:free` is a 117.9B-parameter MoE (5.1B active per forward pass, 131K context) explicitly optimized for agentic routing — functionally aligned with the fallback layer's requirement for a general-purpose, high-capability safety net. `qwen/qwen3-coder:free` is an acceptable secondary alternative but must not occupy both the fallback chain and the V2 specialist Proposer role simultaneously to avoid routing ambiguity.
- *Day-0 verification requirement:* D0-2 checklist MUST include explicit confirmation that `openai/gpt-oss-120b:free` is present in the active free-tier catalog before any fallback logic is written against it.
- *Decision:* The informal Orchestrator/Specialist/Verifier triad is replaced with the literature-standard Router/Proposer/Aggregator/Verifier taxonomy throughout all specifications and code interfaces.
- *Rationale:* Aligns blueprint with foundational MoA literature. Aggregator's empirical success coefficient of 0.588 designates it as the highest-criticality role — this must be reflected in its `personaPrompt` design (explicit meta-prompt to critically evaluate and synthesize, not merely pass through). Router maps cleanly to the sparse-topology linear-layer definition. Proposer formalizes the parallel-generation role (parallel execution deferred to V2 but naming is correct from Day 0).

**ADR-011 — Extrinsic Oracle Wrapping for Verifier Node**
- *Decision:* The Verifier MUST wrap LLM generation in a deterministic external oracle (PoT subprocess, Zod schema validator, or `mathjs` symbolic evaluator) appropriate to the query class. Pure LLM self-critique is permitted only for open-ended conversational outputs with no deterministic ground truth.
- *Rationale:* Empirical evidence demonstrates that ungrounded LLM self-critique degrades verification accuracy on deterministic tasks. The oracle's raw stdout/stderr output MUST be injected as the Proposer's revision signal verbatim — not paraphrased — to preserve the exact error semantics. The `oracleType` field in all Verifier telemetry events enables post-session analysis of which query classes hit `LLM_ONLY` mode.

**ADR-012 — `tencent/hy3-preview:free` Rejected; `inclusionai/ling-2.6-flash:free` Added as V2 Candidate**
- *Decision:* `tencent/hy3-preview:free` excluded from all routing paths (V1 and V2). `inclusionai/ling-2.6-flash:free` (104B total, 7.4B active) added as a V2 parallel Proposer candidate subject to D0-2 endpoint verification.
- *Rationale (rejection):* The `:preview` suffix on `hy3-preview` directly violates the hard constraint established in §6.1 and ADR-001: *"All inference endpoints MUST use open-weight models with no `preview` flag."* This constraint exists because preview windows are finite; over-reliance on a preview model as a Proposer node causes systemic pipeline failure when the preview closes — a failure mode documented in the original v1.0 blueprint and hardened through every subsequent version. No exception is warranted regardless of the model's capability profile.
- *Rationale (ling-2.6-flash acceptance):* 104B total / 7.4B active provides a high-efficiency parallel Proposer profile suitable for the token-budget-constrained V2 parallel sampling layer. Must be confirmed present and non-preview in the live registry before V2 routing logic references it.

**ADR-013 — Symbolic-MoE Added to V2 Migration Path**
- *Decision:* V2 MUST implement Symbolic-MoE inter-node compression alongside GoA to mitigate the context window bottleneck introduced by concatenating N full natural-language Proposer outputs.
- *Rationale:* GoA with parallel Proposers generates N multi-paragraph outputs that must reach the Aggregator. Without compression, the Aggregator's input context scales as O(N × response_length), rapidly exhausting context windows and inflating TTFT. Symbolic-MoE compresses intermediate outputs into typed structured representations, reserving natural language for the final synthesis step only. The ~44% runtime reduction figure requires empirical validation; it is flagged as a planning estimate, not a hard guarantee.
- *V2 implementation requirement:* A `SymbolicSerializer` interface alongside `AgentNode` that maps Proposer output type (code, logic, conversational) to the appropriate symbolic format.

---

## Appendix B: Rejected Instructions Log

> This appendix documents instructions submitted for blueprint inclusion that were evaluated and rejected, with full reasoning. Transparency about rejections is as important as documenting accepted changes — a blueprint executed by an AI agent swarm must not contain commands that could cause harm regardless of their framing.

**REJECTED-001 — `npx --antigravity install sickn33/antigravity-awesome-skills` (from Edit 4, v2.3)**
- *Submitted as:* "run `npx --antigravity install sickn33/antigravity-awesome-skills --category=ai-agents,data-engineering` to instantly provision the `agent-orchestrator` and `vector-database-engineer` packages"
- *Rejection reasons:*
  1. **`--antigravity` is not a valid `npx` flag.** The npm/npx CLI supports `--yes`, `--no`, `--package`, `--call`, `--shell`, and a small set of other documented flags. `--antigravity` does not exist in any published npm CLI specification. A developer or agent executing this command would receive an npm error.
  2. **`sickn33/antigravity-awesome-skills` is an unverified third-party source.** This pattern (`npx githubuser/reponame`) instructs npm to fetch and execute code from an arbitrary GitHub repository. No npm registry provenance, no published package manifest, no version pinning, no security audit trail.
  3. **Supply chain attack vector.** Embedding an install command pointing to an unvetted external source in an executable specification document is a standard supply chain attack pattern. A swarm agent executing this blueprint could run arbitrary code from an uncontrolled source on the developer's machine.
- *Legitimate content from the same edit (accepted):* The `vLLM` / `TensorRT-LLM` enterprise scaling note was accepted and added to §7 as an out-of-scope post-PoC reference. That content is accurate, well-established, and references no external install commands.
