# Phase 4 Research: Persistence & Resilience

## Objectives
- Implementation of Agent Memory using PostgreSQL `pgvector`.
- Implementation of Semantic Cache for rapid response reuse.
- Implementation of Fallback Chain for high availability.
- Verification of cache hit rate (SM-4).

## Agent Memory (PostgreSQL + pgvector)
- **Schema**: `agent_memory` (id, content, embedding, metadata, created_at).
- **Index**: HNSW (Hierarchical Navigable Small World) for fast similarity search.
- **Connection**: Using `pg` client with environment variables.

## Semantic Cache
- **Logic**: Before triggering the MoA pipeline, compute query embedding.
- **Query**:
  ```sql
  SELECT content, 1 - (embedding <=> $1) as similarity 
  FROM agent_memory 
  WHERE 1 - (embedding <=> $1) >= 0.95 
  ORDER BY similarity DESC LIMIT 1;
  ```
- **Threshold**: 0.95 (Blueprint §11).
- **Update**: Cache successful pipeline outputs to the same table with `type: 'cache'` metadata.

## Fallback Chain
- **Primary**: `nvidia/nemotron-3-super-120b-a12b:free`
- **Secondary**: `google/gemma-2-27b-it:free` (or Gemma-4-31B as per PRD, but I'll check what's available on OpenRouter)
- **Tertiary**: `gpt-oss-120b` (or similar deepseek-based)
- **Logic**: Wrap `callModel` in a retry/fallback loop.

## SM-4 Verification
- Seed the cache with 5 prompts.
- Re-run the same 5 prompts (with slight variations).
- Assert hit rate ≥ 40%.

## Technical Dependencies
- `pg`: Already installed.
- `dotenv`: Already used.
