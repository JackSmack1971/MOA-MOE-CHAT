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
- [x] **FR-16**: CI credential detection (git-secrets/truffleHog).
- [x] **FR-20**: Pre-API semantic cache lookup (cosine ≥ 0.98).
- [x] **FR-21**: fetchWithBackoff (3 retries, jitter).
- [x] **FR-22**: Fallback chain (Nemotron → Gemma-4-31B → GPT-OSS-120B).

### M6: V2 Graph-of-Agents (GoA)
- [ ] **FR-23**: Subgraph extraction using Meta-LLM (`inclusionai/ring-2.6-1t:free`) with sampling budget $k=3$.
- [ ] **FR-24**: Peer-to-peer relevance scoring with sparsity threshold $\tau = 0.05$.
- [ ] **FR-25**: Adjacency matrix computation and Source/Target partitioning based on centrality.
- [ ] **FR-26**: Bidirectional message passing (Forward: Source -> Target, Reverse: Target -> Source).
- [ ] **FR-27**: Dynamic pooling supporting `GoA-Max` and `GoA-Mean` methods.

## Non-Functional Requirements
- [x] **NFR-01**: No secrets or PII in logs/DB.
- [x] **NFR-02**: Input whitelist sanitization.
- [x] **NFR-05**: DALC overhead ≤ 100ms.
- [ ] **NFR-06**: V2 token consumption reduction ≥ 50% vs V1.
- [ ] **NFR-07**: Graph orchestration latency overhead ≤ 500ms (excluding model inference).

