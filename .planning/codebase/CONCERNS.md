# Concerns

## Risks
- **Memory Constraint**: 6.3 GB limit on 16 GB host requires careful buffer management.
- **Model Availability**: Dependency on OpenRouter free tier models may lead to rate limiting.
- **Inference Latency**: Parallel proposers and iterative RMoA might exceed latency targets without early exit.
- **Verification Integrity**: Deterministic oracles must perfectly match gold outputs for math/logic.

## Debt/Future
- AgentNode is structurally immutable but currently lacks GoA sampling logic (V2).
- Semantic cache hit rate needs empirical validation on the golden set.
