-- agent_memory DDL
-- traces: FRD-FR-17, PRD §7.4

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agent_memory (
  id           bigserial  PRIMARY KEY,
  content      text       NOT NULL,
  metadata     jsonb,     -- stores: dalc_score, rmoa_trace, halt_reason
  embedding    vector(384),
  reward_score numeric    DEFAULT 0.0,
  created_at   timestamp  DEFAULT current_timestamp
);

-- HNSW index for vector cosine operations (PRD §7.4)
CREATE INDEX IF NOT EXISTS agent_memory_embedding_idx ON agent_memory USING hnsw (embedding vector_cosine_ops);
