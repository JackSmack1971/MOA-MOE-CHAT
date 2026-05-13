<!-- models.md — update this file freely as dev cycle progresses -->

## Models

- Primary model for all four roles: `nvidia/nemotron-3-super-120b-a12b:free`.
- Fallback chain exclusively: Gemma-4-31B → GPT-OSS-120B. Approved set contains these three models only.
- EmbeddingService: `nomic-embed-text-v1.5` (q8, WASM) — singleton, pre-warmed, shared across DALC/RMoA/semantic cache/GRPO.
