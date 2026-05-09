# Architecture

## Core Patterns
- **AgentNode Abstraction**: Immutable structural interface for V2 migration.
- **Self-MoA Loop**: Router → Proposer(s) → DALC → Aggregator → Verifier.
- **RMoA Loop**: Iterative delta-based early exit (ε=0.02, maxSteps=10).
- **Oracle Layer**: Verifier wraps PoTExecutor, ZodValidator, and MathEvaluator.

## State Management
- **Persistence**: agent_memory table with HNSW index for vector search.
- **Resilience**: fetchWithBackoff (3 retries + jitter), fallback chain.

## V2 Migration Hooks
- SymbolicSerializer stub.
- edgeConstructor placeholder.
