@models.md

## Behavioral Thresholds

- DALC post-processing: cosine ≤ 0.85 or emit `COLLAPSE_UNRESOLVED`. Inject orthogonality directive verbatim.
- RMoA: delta-based early exit at ε=0.02; hard cap `maxSteps=10`.
- Verifier: PoT executes via `vm.runInNewContext`; inject raw oracle output verbatim. `LLM_ONLY` for pure conversational turns exclusively.

## Immutability Contracts

- `personaPrompt` on every AgentNode must remain structurally immutable (KV-cache guarantee).
- System prompt block must be byte-identical on every turn.
- V1 scope: single primary model. V2 additions limited to `SymbolicSerializer` stub and `edgeConstructor` placeholder per PROJECT_STRUCTURE.md.

## Authority & Gates

- Conflict resolution order: Blueprint v2.3 → PRD v1.0 → FRD v1.0 → TAD → ADR-001–013.
- Pre-commit gate: `npm test -- --grep "golden"` must pass 100%.
- Memory budget: ≤6.3 GB resident (16 GB host).
