# Tech Stack

## Core
- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict: true, target: es2022, module: node16)
- **Package Manager**: npm

## Models & AI
- **Orchestrator**: Self-MoA / RMoA
- **Primary Model**: `nvidia/nemotron-3-super-120b-a12b:free`
- **Fallback Chain**: `gemma-4-31b` -> `gpt-oss-120b`
- **Embeddings**: `nomic-embed-text-v1.5` (WASM, q8, <200MB)

## Infrastructure
- **Database**: PostgreSQL with `pgvector`
- **Transactions**: ACID compliant writes
- **Caching**: Semantic Cache (cosine ≥0.98)

## Libraries
- **Validation**: Zod
- **Logging**: Pino (PII redaction)
- **Math**: mathjs
- **Sandbox**: `vm` (runInNewContext)
- **Telemetry**: custom metadata in `agent_memory` (jsonb)
