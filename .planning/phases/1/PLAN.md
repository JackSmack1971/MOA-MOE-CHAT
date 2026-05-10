# Phase 1: Foundation (Week 1)

## Goal
Establish the project foundation by completing Day-0 prerequisites (D0-1..D0-6), creating the project scaffold, and initializing core services like the EmbeddingService and Golden Fixture set.

## Environment Audit (from RESEARCH.md)
- **Node**: v22.20.0 (PASS)
- **PostgreSQL**: We will use **Docker** (`docker-compose.yml`) for setup.
- **OpenRouter**: Key missing (BLOCKER for D0-1/D0-2)

## Plan

### 1. Project Initialization
- [ ] Initialize `package.json` with strict TypeScript and core dependencies.
- [ ] Create directory structure from `PROJECT_STRUCTURE.md`.
- [ ] Setup `.env.example` and `dotenv-vault`.

### 2. Core Foundation
- [ ] Implement `src/core/AgentNode.ts` interface (FR-01).
- [ ] Implement `src/services/EmbeddingService.ts` (singleton, nomic-embed-text-v1.5).
- [ ] Seed `fixtures/golden-fixture-set.json` from documentation.

### 3. Day-0 Validation
- [ ] D0-1: User confirm $10 deposit.
- [ ] D0-2: Implement `scripts/d0-verify-models.ts` and verify endpoints.
- [ ] D0-3: Provision PostgreSQL 16 + pgvector (provide `docker-compose.yml` if needed).
- [ ] D0-4: Verify EmbeddingService p95 ≤ 50ms.
- [ ] D0-5: Setup pre-commit scans (`git-secrets`).
- [ ] D0-6: Calibrate DALC threshold.

## Verification
- `npm run d0-verify` must pass all gates.
- `vitest` unit tests for EmbeddingService.
