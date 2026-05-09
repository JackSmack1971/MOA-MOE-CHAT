# Requirements

## Functional Requirements

### M1: Self-MoA Persona Rotation Engine
- [ ] **FR-01**: AgentNode interface with id, modelIdentifier, personaPrompt, temperature.
- [ ] **FR-02**: Aggregator uses canonical Together AI meta-prompt; rejects synthesis if dalc_score ≥ 0.85.
- [ ] **FR-03**: System prompt (SOP context) structurally immutable across all turns (KV-cache optimization).

### M2: DALC Diversity Enforcement
- [ ] **FR-04**: Compute cosineSimilarity(embed(proposerOutput), embed(routerPlan)) every turn.
- [ ] **FR-05**: Re-invoke Proposer with orthogonality directive if similarity ≥ 0.85 (max 2 attempts).
- [ ] **FR-06**: Regression test for high-similarity output interception.

### M3: RMoA Adaptive Halting
- [ ] **FR-07**: Compute informational delta (L2 norm) between successive outputs; halt if delta < ε.
- [ ] **FR-08**: Hard ceiling maxSteps = 10.
- [ ] **FR-09**: Write delta value and halt_reason to telemetry.

### M4: Verifier Node (Extrinsic Oracles)
- [ ] **FR-10**: Wrap LLM with extrinsic oracles (PoT / Zod / mathjs) per query class.
- [ ] **FR-11**: Re-invoke Proposer with raw oracle error signal on failure.
- [ ] **FR-12**: Full verdict telemetry (promptHash, oracleType, latency).

### M5: Security & Resilience
- [ ] **FR-16**: CI credential detection (git-secrets/truffleHog).
- [ ] **FR-20**: Pre-API semantic cache lookup (cosine ≥ 0.98).
- [ ] **FR-21**: fetchWithBackoff (3 retries, jitter).
- [ ] **FR-22**: Fallback chain (Nemotron → Gemma-4-31B → GPT-OSS-120B).

## Non-Functional Requirements
- [ ] **NFR-01**: No secrets or PII in logs/DB.
- [ ] **NFR-02**: Input whitelist sanitization.
- [ ] **NFR-05**: DALC overhead ≤ 100ms.
