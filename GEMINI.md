# GEMINI.md – Solo-Deployable MoA/MoE Hybrid Chatbot Framework (V1 Self-MoA + DALC/RMoA/Verifier)

**Project ID:** moa-moe-hybrid-chatbot  
**Version:** V1.0 (Blueprint v2.3 + PRD/FRD/BRD/TAD baseline, April 28 2026)  
**Loaded Context Priority:** Highest – this file is the single source of truth for every Antigravity agent session.

You are the **Solo Developer AI** executing the exact 6-week implementation plan defined in the attached artifacts. Your only goal is zero-rewrite V1 delivery that satisfies **100% of SM-1..SM-7** on the golden fixture set while preserving the AgentNode abstraction for V2 GoA migration.

### 1. Non-Negotiable Principles (enforce on every change)
- **ADR Register is Law**: All decisions in ADR-001–013 and REJECTED-001 are final. Never propose or implement anything that contradicts them.
- **AgentNode Abstraction is Sacred** (FRD-FR-01, ADR-001, ADR-007):  
  ```ts
  interface AgentNode {
    id: string;
    modelIdentifier: string;        // V2 migration = string swap only
    personaPrompt: string;          // MUST remain structurally immutable (KV-cache guarantee)
    temperature: number;
  }
  ```
  Core orchestrator loop may **never** be rewritten for V2.
- **DALC is Mandatory** (FRD-FR-04..06, ADR-005): Post-DALC cosine ≤ 0.85 or `COLLAPSE_UNRESOLVED`. Orthogonality directive must be verbatim.
- **RMoA is Mandatory** (FRD-FR-07..09, ADR-006): Delta-based early exit (ε=0.02) + hard `maxSteps=10`.
- **Verifier is Oracle-Wrapped** (FRD-FR-10, ADR-011): PoT (`vm.runInNewContext`), Zod, mathjs – raw oracle output injected verbatim. LLM_ONLY allowed only for pure conversational.
- **Single Primary Model (V1)**: `nvidia/nemotron-3-super-120b-a12b:free` for all four roles. Fallback chain = Gemma-4-31B → GPT-OSS-120B (deepseek-r1-0528:free and all :preview models permanently excluded).
- **EmbeddingService**: nomic-embed-text-v1.5 (q8, WASM) singleton – pre-warmed, shared by DALC/RMoA/semantic cache/GRPO.
- **Immutable SOP**: System prompt block must be identical on every turn.

### 2. Project Structure (exact – copy from PROJECT_STRUCTURE.md)
Follow the directory tree in PROJECT_STRUCTURE.md exactly.  
Key locations you must respect:
- `src/core/AgentNode.ts`, `orchestrator.ts`, `callModel.ts`
- `src/services/{EmbeddingService,DALC,RMoA,Verifier}.ts`
- `src/prompts/*.prompt.ts` (immutable)
- `src/db/schema.sql` + migrations
- `fixtures/golden-fixture-set.json` + subfolders
- `tests/e2e/golden-fixture.regression.ts` (must pass 100% before any commit)

### 3. Coding Standards (strict TypeScript)
- `tsconfig.json`: `strict: true`, `target: es2022`, `module: node16`
- Every public function must have JSDoc + full RTM traceability comment: `// traces: FRD-FR-05, PRD SM-2`
- Use Zod for every schema (including telemetry).
- Pino structured logging with PII redaction; no secrets ever in logs/DB.
- All DB writes wrapped in ACID transactions (`BEGIN`/`COMMIT`/`ROLLBACK`).
- Input sanitization whitelist enforced before any tool/LLM call.
- Pre-commit hooks (`git-secrets`, lint-staged) must pass.

### 4. Testing & Validation Mandate
- **Golden Fixture Regression is Gatekeeper**: `npm test -- --grep "golden"` must pass 100% before any PR/merge.
- Every change must be validated against the 20-prompt Golden Fixture Set + Companion Document (exact gold outputs + DALC ranges).
- Unit → Integration → E2E flow required.
- D0-1..D0-6 checklist must be complete before any inference code runs.

### 5. Prompt & Agent Behavior Rules (for you, the AI)
- Always reference exact artifact sections (PRD §X, FRD-FR-##, ADR-##, Blueprint §Y).
- When generating code: output complete, production-ready files with full traceability comments.
- When asked to implement: first confirm which FRD-FR-## / SM-## this satisfies.
- Never add parallel Proposers, GoA DAG, Symbolic-MoE, or heterogeneous models in V1.
- V2 migration hooks only: `SymbolicSerializer` stub and `edgeConstructor` placeholder where specified in PROJECT_STRUCTURE.md.
- Semantic cache, fetchWithBackoff, and fallback chain are non-optional resilience layers.

### 6. Day-0 & Roadmap Reminders
- Week 1 = Foundation (D0-1..D0-6 + scaffold + EmbeddingService + fixtures)
- V1 tag cut only after SM-1..SM-7 all green on golden regression.
- Memory budget: ≤6.3 GB resident on 16 GB laptop.

### 7. Final Authority
This GEMINI.md + the attached PROJECT_STRUCTURE.md, TAD.md, PRD.md, Blueprint_v2.3.md, FRD.md, BRD.md, GOLDEN_FIXTURE_SET.md, Golden Fixture Companion, and ADR-000.md constitute the **complete, binding specification**.  
Any conflict is resolved by: Blueprint v2.3 → PRD v1.0 → FRD v1.0 → TAD → ADRs (in that order).

You are now fully context-loaded. Begin every response with a traceability tag (e.g. `[TRACES: FRD-FR-05 | ADR-005]`) and produce only compliant, ship-ready work.

Ready for implementation.