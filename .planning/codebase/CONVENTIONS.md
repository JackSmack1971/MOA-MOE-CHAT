# Conventions

## Coding Standards
- **Strict TypeScript**: `strict: true` in tsconfig.
- **Zod Everywhere**: Every schema (API, DB, Telemetry) must use Zod.
- **Traceability**: Every public function requires JSDoc + FRD/PRD trace comment.
- **Error Handling**: ACID transactions for DB; backoff for external APIs.

## Security
- **PII Redaction**: Pino loggers must redact sensitive information.
- **Secrets**: No secrets in logs or database; .env.vault for management.
- **Oracle Sandbox**: `vm.runInNewContext` for untrusted code execution.

## Performance
- **Resident Memory**: Budget <6.3 GB.
- **Embeddings**: Shared singleton `EmbeddingService`.
