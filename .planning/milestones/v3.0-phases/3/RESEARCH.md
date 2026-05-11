# Phase 3 Research: Halting & Verification

## Objectives
- Implementation of RMoA (Residual MoA) adaptive halting module.
- Implementation of Verifier Node with extrinsic oracles (PoT, mathjs, Zod).
- Verification against injected hallucinations (SM-3).

## RMoA Adaptive Halting
- **Mechanism**: Compute L2 norm of the difference between current and previous proposer output embeddings.
- **Threshold (ε)**: 0.02 (ADR-006).
- **Safety Ceiling**: Hard limit of 10 steps (FR-08).
- **Metric Logic**: Informational delta convergence indicates diminishing returns on further persona rotation.

## Verifier Oracles
### 1. Code (Program-of-Thought)
- **Tool**: Node.js `node:vm` module (`runInNewContext`).
- **Safety**: No network access, restricted global object.
- **Logic**: Capture `stdout`/`stderr` and inject back to Proposer for revision (FR-10).

### 2. Math (Symbolic Evaluator)
- **Tool**: `mathjs`.
- **Logic**: Parse numerical assertions and verify against constraints.

### 3. Structured (Schema Validator)
- **Tool**: `zod`.
- **Logic**: Validate JSON outputs against specified schemas.

### 4. Conversational (LLM-only)
- **Logic**: Fallback to pure LLM critique when no deterministic oracle applies.

## Hallucination Injection (SM-3)
- Need to create a regression suite with "buggy" or "hallucinated" proposer outputs to verify that the Verifier correctly intercepts them.
- Goal: ≥ 95% interception rate (FR-10a).

## Technical Dependencies
- `mathjs`: Required for logic/math outputs.
- `node:vm`: Built-in for code execution.
- `zod`: Already installed.
