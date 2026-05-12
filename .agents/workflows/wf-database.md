---
description: Orchestrates an end-to-end database schema lifecycle. Executes Spec-Driven planning, zero-downtime expand-contract migrations, and automated query performance validation.
---

---

description: Orchestrates an end-to-end database schema lifecycle. Executes Spec-Driven planning, zero-downtime expand-contract migrations, and automated query performance validation
---

# /wf-database: Database Orchestration & Migration Pipeline

**Objective:** Execute schema changes and migrations securely while enforcing strict normalization, zero-downtime strategies, and optimal indexing.

## Execution Sequence

When this workflow is invoked, the agent must execute the following steps sequentially, halting for human approval where specified:

### Step 1: Spec-Driven Schema Planning

1. **Call `/speckit.specify`**: Engage the orchestrator to define the business logic for the new schema or data mutation.
2. **Call `/speckit.plan`**: Generate an `implementation_plan.md` artifact proposing the exact table structures, utilizing the following **Hard Constraints**:
   - Primary Keys: Default to `ULID`. Use `UUID v4` strictly for non-sortable security IDs.
   - Timestamps: Always utilize `TIMESTAMPTZ`.
   - Indexing: B-Tree for equality/range; GIN for `jsonb`/array; HNSW/IVFFlat for pgvector.
   - Deletions: Implement soft deletes via `deleted_at`.

### Step 2: Context & Connectivity Validation

1. Verify active connection to the database via the PostgreSQL MCP server.
2. If MCP is inactive, instruct the Terminal Subagent to parse the local ORM schema files instead.

### Step 3: Migration Generation (Expand-Contract)

1. Generate the raw SQL migration scripts or ORM specific migration files.
2. **Constraint Enforcement**: Ensure the migration adheres to the Zero-Downtime Expand-Contract Strategy.
   - Phase 1 must ONLY add columns/tables (Nullable or Defaulted).
   - If adding constraints to large tables, use `NOT VALID`.
3. Generate a `walkthrough.md` Artifact detailing the migration impact[cite: 31, 32].
4. **MANDATORY REVIEW GATE**: Pause execution. Request explicit approval from the Engineering Manager in the Agent Manager Inbox.

### Step 4: Execution & Performance Validation

1. Upon approval, utilize the Terminal Subagent to execute the migration[cite: 110]. (Ensure Terminal Policy is set to Request Review ).
2. Generate the required application-layer queries (Repository layer).
3. **Query Audit**: Execute `EXPLAIN ANALYZE` on the newly generated queries via MCP or Terminal.
4. Assert that no sequential scans occur on large tables and that composite index orders are respected.
5. If N+1 queries are detected, autonomously refactor the application code to utilize `DataLoader` or manual JOINs.
