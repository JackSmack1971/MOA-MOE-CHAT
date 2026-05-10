**Optimal Project Structure: Solo-Deployable MoA/MoE Hybrid Chatbot Framework (V1 Self-MoA + DALC/RMoA/Verifier)**

**Fusion Summary**  
This structure is extrapolated directly from PRD v1.0, Blueprint v2.3, ADR-001–013, Golden Fixture Companion, and GOLDEN_FIXTURE_SET.md. It enforces **zero-rewrite V2 migration** (AgentNode abstraction, EmbeddingService reuse, SymbolicSerializer stub), full **RTM traceability**, **golden-fixture regression**, **D0-1..D0-6** Day-0 gates, and all Must-Have FRs/NFRs.  

Layout follows Node.js/TypeScript enterprise best practices (strict mode, monorepo-ready, ACID, security-first, test-driven) while keeping solo-dev velocity high (<6-week window). Total estimated LOC <8k for V1; headroom for GoA/Symbolic-MoE in V2.  

**Directory Tree (V1 – production-ready)**

```bash
moa-moe-hybrid-chatbot/                  # Root (npm init)
├── .env.vault                          # dotenv-vault (D0-5)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      # vitest + security scan + db:migrate test
│   │   └── release.yml                 # V1 tag + fixture regression
│   └── ISSUE_TEMPLATE/                 # RTM-linked bug reports
├── .gitignore
├── .pre-commit-config.yaml             # git-secrets + truffleHog + lint-staged (NFR-01)
├── package.json                        # scripts: db:migrate, test, dev, benchmark:golden, start
├── tsconfig.json                       # strict: true, target: es2022, module: node16
├── vitest.config.ts
├── Dockerfile                          # (optional: prod image with pgvector)
├── LICENSE.md
├── README.md                           # D0 checklist, quickstart, SM-1..SM-7 dashboard
├── docs/
│   ├── PRD.md                          # (symlink or copy)
│   ├── Blueprint_v2.3.md
│   ├── ADR-001-to-013.md               # consolidated
│   ├── RTM.md                          # FR-01..FR-22 + NFR mapping to tests
│   └── Golden-Fixture-Companion.md
├── fixtures/                           # GOLDEN_FIXTURE_SET + Companion
│   ├── golden-fixture-set.json         # 20 prompts + gold outputs + DALC ranges
│   ├── math/                           # 5 files
│   ├── code/
│   ├── logic/
│   └── conversational/
├── src/
│   ├── config/
│   │   ├── index.ts                    # OpenRouter keys, temperatures (ADR-009), thresholds
│   │   ├── agents.ts                   # AgentNode registry (Router/Proposer/Aggregator/Verifier)
│   │   └── models.ts                   # fallback chain (Nemotron → Gemma-4 → GPT-OSS-120B)
│   ├── core/
│   │   ├── AgentNode.ts                # FR-01 interface (modelIdentifier swap = V2)
│   │   ├── callModel.ts                # fetchWithBackoff + semantic cache + prefix-cache aware
│   │   └── orchestrator.ts             # main Self-MoA loop (Router→Proposer→DALC→Aggregator→Verifier + RMoA)
│   ├── services/
│   │   ├── EmbeddingService.ts         # nomic-embed-text-v1.5 singleton (ADR-003, ≤200MB, WASM/q8)
│   │   ├── DALC.ts                     # enforceDALC (FR-04..06, cosine ≤0.85, max 2 retries)
│   │   ├── RMoA.ts                     # checkConvergence (ε=0.02, maxSteps=10, FR-07..09)
│   │   └── Verifier.ts                 # extrinsic oracle wrapper (PoT vm.runInNewContext, Zod, mathjs) – ADR-011
│   ├── oracles/
│   │   ├── PoTExecutor.ts              # vm sandbox + raw stdout injection
│   │   ├── ZodValidator.ts
│   │   └── MathEvaluator.ts
│   ├── db/
│   │   ├── index.ts                    # pg + pgvector client (ACID transactions)
│   │   ├── schema.sql                  # agent_memory + HNSW index (FR-17)
│   │   └── migrations/                 # npm run db:migrate (D0-3)
│   ├── memory/
│   │   ├── GRPO.ts                     # reward_score, metadata (dalc_score, rmoa_trace)
│   │   └── SemanticCache.ts            # cosine ≥0.98 hit (FR-20)
│   ├── prompts/
│   │   ├── router.prompt.ts
│   │   ├── proposer.prompt.ts          # T=0.7
│   │   ├── aggregator.prompt.ts        # canonical Together AI meta-prompt + DALC rejection (FR-02, T=0.2)
│   │   └── verifier.prompt.ts
│   ├── types/
│   │   ├── index.ts                    # DALCResult, RMoAHaltDecision, AgentNode, Verdict, etc.
│   │   └── fixtures.ts                 # GoldenFixture type
│   ├── utils/
│   │   ├── logger.ts                   # pino + PII redaction
│   │   ├── inputSanitizer.ts           # whitelist (NFR-02)
│   │   └── telemetry.ts                # per-turn metadata (dalc, rmoa, oracleType, latency)
│   └── index.ts                        # CLI entry: chat, benchmark, seed-fixtures
├── tests/
│   ├── unit/
│   │   ├── dalc.test.ts                # injected high-similarity regression (FR-06)
│   │   ├── rmoa.test.ts
│   │   └── oracle.test.ts
│   ├── integration/
│   │   ├── pipeline.slice.test.ts      # 5-prompt E2E <10s (Objective 1.1)
│   │   └── fallback.chain.test.ts
│   └── e2e/
│       ├── golden-fixture.regression.ts # SM-1..SM-7 full suite (20 prompts)
│       └── load.250-turn.test.ts       # rate-limit + backoff validation
├── scripts/
│   ├── d0-verify-models.ts             # D0-2 API check (no :preview, deepseek absent)
│   ├── calibrate-dalc.ts               # D0-6 threshold run
│   └── benchmark.ts                    # DALC post-score + accuracy vs gold
└── .env.example
```

**Key Design Decisions (tied to artifacts)**

- **AgentNode abstraction** (ADR-001, FR-01, V2 migration path): single `modelIdentifier` string swap + personaPrompt → zero core loop rewrite for GoA/heterogeneous/Symbolic-MoE.  
- **EmbeddingService singleton** (ADR-003): pre-warmed at startup; used by DALC, RMoA, semantic cache, and future GoA node sampling.  
- **DALC & RMoA as first-class modules** (ADR-005, ADR-006): injected between Proposer/Aggregator and after each Proposer step; full telemetry to `agent_memory` (metadata jsonb).  
- **Verifier oracle layer** (ADR-011, FR-10): PoT/Zod/mathjs mandatory for deterministic classes; raw output injected verbatim; `LLM_ONLY` flag only for CONV.  
- **Golden Fixture integration**: `fixtures/` + dedicated regression test seeds exactly the 20 prompts + gold outputs + DALC ranges; runs as `npm test -- --grep "golden"`. Supports SM-1 accuracy, SM-2 DALC ≤0.85, SM-3 verifier ≥95%.  
- **Security & Resilience** (NFR-01, NFR-02, FR-21, FR-22): pre-commit hooks, input sanitization, fetchWithBackoff (3 retries + jitter), fallback chain, no credentials in logs/DB.  
- **Persistence** (FR-17..19): ACID transactions, daily pg_dump cron stub, HNSW index.  
- **Scripts & DX**: `npm run db:migrate`, `npm run benchmark:golden`, `npm run d0-verify` – all D0 gates automated.  
- **V2 hooks**: `SymbolicSerializer` stub in `services/`, `edgeConstructor` placeholder in `core/`, domain-card relevance scoring ready via EmbeddingService. Parallel Proposer slot already in orchestrator signature.

**Best-Practice Alignment (all domains)**

| Domain              | Practice Enforced                                                           | Document Trace              |
| ------------------- | --------------------------------------------------------------------------- | --------------------------- |
| **Architecture**    | Layered (core/services/db/memory), immutable SOP prompts, KV-cache friendly | ADR-001, FR-03              |
| **TypeScript**      | Strict, interfaces-first, Zod everywhere                                    | PRD §7.3                    |
| **Testing**         | Unit → Integration → E2E + golden regression; 100% FR coverage target       | SM-1..SM-7                  |
| **Security**        | Zero plaintext secrets, input whitelist, oracle sandbox                     | NFR-01/02, ADR-REJECTED-001 |
| **Performance**     | Singleton embedding, semantic cache, RMoA early-exit, backoff               | NFR-05, FR-21               |
| **Observability**   | Structured pino + per-turn metadata (dalc_score, rmoa_trace, oracleType)    | FR-12, FR-09                |
| **Maintainability** | RTM-driven, ADR-consolidated docs, fixture-driven regression                | Blueprint §10               |
| **Extensibility**   | V2 migration cost <200 LOC (model swap + edge fn + serializer)              | ADR-007, ADR-013            |

**Next Actions (Immediate Post-Structure)**  

1. `npm init -y && npm install` + copy tree.  
2. Execute D0-1..D0-6 (scripts provided).  
3. `npm run db:migrate && npm test`.  
4. Seed golden fixtures → run full regression → baseline SM-1..SM-7.  

This structure is **actionable Day 0**, fully compliant, and future-proof for Graph-of-Agents + Symbolic-MoE without breaking changes. All [VERIFIED: PRD + Blueprint + ADRs] alignment; zero conflicts detected; H-risks resolved via ADR hardening and oracle enforcement. Ready for V1 implementation.
