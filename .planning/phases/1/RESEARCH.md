# Phase 1 Research: Foundation

## Environment Audit
- **Node.js**: v22.20.0 (Matches requirements)
- **npm**: 10.9.3
- **Git**: 2.53.0
- **PostgreSQL**: `psql` command not found. Need to verify if PostgreSQL 16 + pgvector is installed or if a containerized version will be used.
- **OpenRouter**: Connectivity test PASSED. `.env` file configured.

## Day-0 Prerequisites Analysis
### D0-1: OpenRouter Deposit
- **Status**: UNKNOWN. Requires user confirmation of $10 deposit.
- **Action**: Provide script to check RPD ceiling once API key is provided.

### D0-2: Model Endpoint Verification
- **Required**: Nemotron-3, Gemma-4, GPT-OSS (all :free).
- **Blocker**: Missing API key.

### D0-3: PostgreSQL + pgvector
- **Status**: MISSING.
- **Action**: Propose setup via Docker or local installation.

### D0-4: EmbeddingService (WASM)
- **Library**: `@huggingface/transformers` (ONNX/WASM).
- **Status**: Node 22 supports WASM/Web-streams. Should be compatible.

### D0-5: Secrets Vault
- **Library**: `dotenv-vault`.
- **Pre-commit**: `git-secrets`.

### D0-6: DALC Calibration
- **Requirement**: Needs functional Proposer + Aggregator. This will be the final step of Phase 1.

## Project Scaffold
- Need to initialize `npm init` and install dependencies.
- Directory structure from `PROJECT_STRUCTURE.md` needs to be created.

## Golden Fixture Set
- Source: `docs/GOLDEN_FIXTURE_SET.md`.
- Action: Create `fixtures/golden-fixture-set.json`.
