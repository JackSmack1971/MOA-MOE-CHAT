---
trigger: model_decision
description: >
  Authoritative coding ruleset for PostgreSQL 18.3 (released 2026-02-26).
  Covers schema design, query patterns, async I/O configuration, new PG18
  features (uuidv7, virtual generated columns, temporal constraints, RETURNING
  OLD/NEW, skip scan, OAuth), security hardening, replication, and migration
  from PG17. Consumed by AI coding agents generating production-grade SQL,
  DDL, and application-layer database code.
globs:
  - "**/*.sql"
  - "**/*.psql"
  - "**/migrations/**"
  - "**/db/**"
  - "**/database/**"
  - "**/prisma/schema.prisma"
  - "**/drizzle/**"
  - "**/knex/**"
  - "**/alembic/**"
  - "**/*postgres*"
  - "**/*pg*config*"
  - "**/postgresql.conf"
  - "**/pg_hba.conf"
version: "18.3"
last_updated: "2026-02-26"
sources:
  - https://www.postgresql.org/docs/18/
  - https://www.postgresql.org/docs/release/18.3/
  - https://www.postgresql.org/docs/18/release-18.html
---

# PostgreSQL 18.3 Rules

> **Version**: PostgreSQL 18.3 (2026-02-26 patch release, resolves 9 regression
> bugs from 18.2 including standby freeze, pg_trgm crash, substring encoding errors,
> and PL/pgSQL composite-type casting failures).  
> **EOL**: PostgreSQL 18 is supported until **2030-09-25**.  
> **CRITICAL**: Always run 18.3 — not 18.0/18.1/18.2; each contained CVEs or
> data-corruption-class regressions (see §Known Issues).

---

## Table of Contents

1. [Breaking Changes & Migration](#1-breaking-changes--migration-pg17--pg18)
2. [Async I/O Subsystem](#2-async-io-subsystem-pg18-headline-feature)
3. [UUID Strategy](#3-uuid-strategy-uuidv7)
4. [Generated Columns](#4-generated-columns-virtual-now-default)
5. [RETURNING OLD/NEW](#5-returning-oldnew)
6. [Temporal Constraints](#6-temporal-constraints)
7. [Skip Scan & Query Optimization](#7-skip-scan--query-optimization)
8. [Indexes](#8-indexes)
9. [Security & Authentication](#9-security--authentication)
10. [Schema Design Best Practices](#10-schema-design-best-practices)
11. [Query Patterns](#11-query-patterns)
12. [Autovacuum & Maintenance](#12-autovacuum--maintenance)
13. [Replication & High Availability](#13-replication--high-availability)
14. [Monitoring & Observability](#14-monitoring--observability)
15. [Wire Protocol 3.2](#15-wire-protocol-32)
16. [Known Issues & CVE Mitigations](#16-known-issues--cve-mitigations)
17. [Production Checklist](#17-production-checklist)

---

## 1. Breaking Changes & Migration (PG17 → PG18)

### 1.1 Data Checksums Enabled by Default

`initdb` now enables data checksums by default in PG18. This is a **hard
incompatibility** with `pg_upgrade` if the old cluster was initialized without
checksums.

```bash
# ❌ ANTI-PATTERN: upgrading a non-checksum PG17 cluster without --no-data-checksums
pg_upgrade -b /usr/lib/postgresql/17/bin -B /usr/lib/postgresql/18/bin \
  -d /var/lib/postgresql/17/main -D /var/lib/postgresql/18/main

# ✅ CORRECT: if old cluster has no checksums, disable on new cluster to match
initdb --no-data-checksums -D /var/lib/postgresql/18/main

# ✅ PREFERRED: enable checksums on old cluster first, then upgrade with checksums
pg_checksums --enable -D /var/lib/postgresql/17/main  # requires PG shutdown
pg_upgrade ...  # both clusters now have checksums — compatible

# Verify checksum state
SHOW data_checksums;
SELECT pg_checksums_file_size();
```

**Rule**: When running `pg_upgrade` from PG17 → PG18, either:
- Enable checksums on the old PG17 cluster before upgrading, **or**
- Initialize the new PG18 cluster with `--no-data-checksums` to match the old state.
- Enable checksums post-upgrade with `pg_checksums --enable` during a maintenance window.

### 1.2 Timezone Abbreviation Lookup Order Change

PG18 checks the **session's timezone abbreviations before** `timezone_abbreviations`.
Code relying on the old lookup order (server variable first) may resolve ambiguous
abbreviations differently.

```sql
-- ❌ PG17 behavior assumed: timezone_abbreviations resolved first
SET timezone_abbreviations = 'Default';
SELECT '2025-01-01 12:00 EST'::timestamptz;  -- resolution may differ

-- ✅ PG18: be explicit, never rely on abbreviation resolution order
SELECT '2025-01-01 12:00 America/New_York'::timestamptz;
SELECT '2025-01-01T12:00:00-05:00'::timestamptz;  -- ISO 8601 with offset

-- Inspect current effective abbreviations
SELECT * FROM pg_timezone_abbrevs ORDER BY abbrev;
```

**Rule**: Use named time zones (IANA format: `America/New_York`) or explicit
UTC offsets in all application code. Never rely on abbreviation (`EST`, `CST`)
resolution in stored data or query literals.

### 1.3 MD5 Password Authentication Deprecated

`CREATE ROLE` and `ALTER ROLE` now emit deprecation warnings when setting MD5
passwords. MD5 will be **removed in a future major version**.

```sql
-- ❌ DEPRECATED — emits warning in PG18
CREATE ROLE app_user WITH PASSWORD 'secret';  -- hashed as MD5 if pg_hba uses md5
ALTER ROLE legacy_user WITH PASSWORD 'newpass';  -- MD5 hash warning

-- ✅ CORRECT: configure SCRAM in pg_hba.conf
-- /etc/postgresql/18/main/pg_hba.conf
-- host  all  all  0.0.0.0/0  scram-sha-256

-- Force SCRAM at role creation
SET password_encryption = 'scram-sha-256';
CREATE ROLE app_user WITH LOGIN PASSWORD 'strong_password_here';

-- Migrate existing MD5 users
SELECT rolname FROM pg_authid WHERE rolpassword LIKE 'md5%';
-- Then re-issue: ALTER ROLE <rolname> WITH PASSWORD '<newpass>';
-- with password_encryption = 'scram-sha-256'
```

### 1.4 pg_upgrade Statistics Retention (New Behavior)

PG18's `pg_upgrade` **retains optimizer statistics** by default — this is a
new behavior vs PG17 where statistics were dropped. No post-upgrade `ANALYZE`
blizzard, but statistics may reflect old distribution patterns from the previous
major version.

```bash
# ✅ After pg_upgrade, selectively re-analyze high-traffic tables
# rather than running a full ANALYZE across the entire cluster
pg_upgrade ... --jobs=8 --swap  # --swap swaps dirs instead of copy/clone

# Post-upgrade: verify statistics currency
SELECT schemaname, tablename, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE last_analyze < NOW() - INTERVAL '30 days'
ORDER BY n_live_tup DESC;

# Force re-analyze on critical tables only
ANALYZE VERBOSE high_traffic_table;
```

### 1.5 Virtual Generated Columns as Default (Schema Migration Risk)

Existing code that creates generated columns without `STORED` now creates
`VIRTUAL` columns, not stored ones. **This changes physical schema behavior**.

```sql
-- ❌ PG17 behavior: GENERATED ALWAYS AS without qualifier = STORED
-- In PG17 this stored the value on disk
CREATE TABLE orders (
  subtotal NUMERIC(10,2),
  total    NUMERIC(10,2) GENERATED ALWAYS AS (subtotal * 1.1)
);

-- In PG18 the same DDL creates a VIRTUAL column — NOT stored on disk
-- and NOT indexable directly

-- ✅ PG18 EXPLICIT: be explicit in all DDL
CREATE TABLE orders (
  subtotal NUMERIC(10,2),
  total_virtual NUMERIC(10,2) GENERATED ALWAYS AS (subtotal * 1.1) VIRTUAL,
  total_stored  NUMERIC(10,2) GENERATED ALWAYS AS (subtotal * 1.1) STORED
);
```

**Rule**: Always specify `STORED` or `VIRTUAL` explicitly in all generated
column DDL. Never rely on the default (which changed in PG18).

---

## 2. Async I/O Subsystem (PG18 Headline Feature)

### 2.1 io_method Configuration

`io_method` controls the I/O backend. Set in `postgresql.conf`; **requires
server restart**.

```ini
# postgresql.conf

# io_uring: Linux only, best performance on NVMe/fast storage
# Requires Linux kernel 5.1+ and io_uring kernel support
io_method = io_uring

# worker: cross-platform (Linux, macOS, Windows), good default
io_method = worker

# sync: PG17-equivalent behavior — use only for troubleshooting or
#       on platforms/environments where AIO causes issues (e.g. some
#       cloud-managed services use this during preview periods)
io_method = sync
```

### 2.2 Effective I/O Concurrency Tuning

**Critical**: `effective_io_concurrency` must be calibrated to storage queue
depth. Over-configuration causes I/O queuing at the storage layer and can
*regress* performance vs PG17.

```ini
# postgresql.conf — match to your storage

# AWS gp3 (queue depth ~256): leave headroom
effective_io_concurrency = 150
maintenance_io_concurrency = 100

# Local NVMe (queue depth 1024+): can go higher
effective_io_concurrency = 256
maintenance_io_concurrency = 200

# Cloud networked block storage (Azure Ultra, GCP PD): start conservative
effective_io_concurrency = 64

# io_combine_limit: max bytes combined into a single async I/O operation
# Default is usually fine; tune if you see small-I/O overhead
io_combine_limit = 128kB  # up to io_max_combine_limit
```

```sql
-- Diagnostic: inspect current AIO state
SELECT * FROM pg_aios;

-- Inspect io_method and concurrency settings
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name IN (
  'io_method', 'effective_io_concurrency', 'maintenance_io_concurrency',
  'io_combine_limit', 'io_max_combine_limit'
);
```

### 2.3 Checkpoint Storm Mitigation

AIO can exacerbate checkpoint write storms. Tune accordingly:

```ini
# postgresql.conf
checkpoint_completion_target = 0.9   # spread writes across interval
max_wal_size = 4GB                    # allow larger WAL before checkpoint
checkpoint_timeout = 10min            # give WAL more time before forced checkpoint
wal_buffers = 64MB
bgwriter_lru_maxpages = 200
bgwriter_delay = 100ms
```

### 2.4 AIO Anti-Patterns

```ini
# ❌ ANTI-PATTERN: io_uring on non-Linux OS
io_method = io_uring  # will fail to start on macOS/Windows

# ❌ ANTI-PATTERN: effective_io_concurrency exceeds storage queue depth
effective_io_concurrency = 512  # on a gp3 volume with queue depth 256

# ❌ ANTI-PATTERN: keeping io_method = sync on NVMe hardware
# You lose 2-3x throughput improvement from AIO

# ✅ CORRECT: verify io_method took effect after restart
SHOW io_method;
SELECT * FROM pg_aios LIMIT 5;  -- returns rows only if AIO is active
```

---

## 3. UUID Strategy (uuidv7)

### 3.1 Use uuidv7() for Primary Keys

`uuidv7()` generates timestamp-ordered UUIDs — better B-tree locality than
`gen_random_uuid()` (UUIDv4), fewer page splits, better cache behavior.
**uuidv4() is now an alias for gen_random_uuid() in PG18.**

```sql
-- ✅ Primary key with uuidv7 — timestamp-ordered, index-friendly
CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT uuidv7(),
  customer_id BIGINT NOT NULL,
  total       NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extract embedded timestamp from a UUIDv7
SELECT uuid_extract_timestamp(uuidv7());
-- Result: 2026-02-26 14:23:51.442+00

-- ❌ ANTI-PATTERN for primary keys in PG18
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()  -- random, causes B-tree fragmentation
);

-- Backward compatibility: uuidv4() still works (= gen_random_uuid())
SELECT uuidv4();  -- valid alias in PG18
```

### 3.2 UUID Monotonicity Guarantee

UUIDv7 is monotonically increasing within a single millisecond window per
database node. It is **not** globally monotonic across distributed nodes.

```sql
-- Verify ordering property
SELECT uuidv7(), pg_sleep(0.001), uuidv7();
-- First UUID < Second UUID (lexicographically and temporally)

-- Pagination with UUIDv7 primary keys is safe (cursor-based)
SELECT * FROM orders WHERE id > $last_seen_id ORDER BY id LIMIT 50;
```

---

## 4. Generated Columns (Virtual Now Default)

### 4.1 Virtual vs Stored — When to Use Each

```sql
-- VIRTUAL: computed on read, zero disk overhead, NOT indexable directly
-- Best for: derived display values, JSON field extraction
CREATE TABLE user_profiles (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settings JSONB NOT NULL,
  username TEXT GENERATED ALWAYS AS (settings ->> 'username') VIRTUAL,
  email    TEXT GENERATED ALWAYS AS (settings ->> 'email')    VIRTUAL
);

-- STORED: computed on write, persisted to disk, indexable
-- Best for: values used in WHERE/ORDER/JOIN frequently, full-text search
CREATE TABLE products (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  search_vec  TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
  ) STORED
);
CREATE INDEX idx_products_fts ON products USING GIN(search_vec);
```

### 4.2 Virtual Column Limitations

```sql
-- ❌ CANNOT index a VIRTUAL generated column directly
CREATE INDEX idx_username ON user_profiles(username);  -- ERROR in PG18

-- ✅ Use an expression index instead
CREATE INDEX idx_username ON user_profiles((settings ->> 'username'));

-- ❌ CANNOT INSERT/UPDATE a generated column (virtual or stored)
INSERT INTO products (name, search_vec) VALUES ('Widget', 'manual value');  -- ERROR

-- ❌ Virtual columns CANNOT be replicated via logical replication
-- Only STORED generated columns are logical-replication-compatible in PG18

-- ✅ Logical replication: use STORED
CREATE TABLE replicated_table (
  id    BIGINT PRIMARY KEY,
  val   NUMERIC,
  dbl   NUMERIC GENERATED ALWAYS AS (val * 2) STORED  -- replicable
);
```

---

## 5. RETURNING OLD/NEW

### 5.1 Access Pre/Post Values in DML

PG18 adds `old.<col>` and `new.<col>` aliases in `RETURNING` clauses for
`INSERT`, `UPDATE`, `DELETE`, and `MERGE`. Eliminates the need for triggers or
second queries for audit patterns.

```sql
-- UPDATE: return old and new values in one statement
UPDATE products
  SET price = price * 1.10
  WHERE price <= 99.99
  RETURNING
    name,
    old.price AS price_before,
    new.price AS price_after,
    new.price - old.price AS price_delta;

-- DELETE: capture what was deleted
DELETE FROM sessions
  WHERE expires_at < NOW()
  RETURNING
    old.session_id AS deleted_session,
    old.user_id    AS user_id,
    old.expires_at AS expired_at;

-- INSERT with ON CONFLICT (upsert): track new vs existing
INSERT INTO products (name, price)
  VALUES ('Widget', 25.00)
  ON CONFLICT (name) DO UPDATE
    SET price = EXCLUDED.price
  RETURNING
    name,
    old.price AS previous_price,    -- NULL if this was an INSERT (not conflict)
    new.price AS current_price,
    (old.price IS DISTINCT FROM NULL) AS was_existing;

-- MERGE with RETURNING (PG18)
MERGE INTO inventory AS tgt
  USING incoming AS src ON tgt.sku = src.sku
  WHEN MATCHED THEN
    UPDATE SET quantity = tgt.quantity + src.quantity
  WHEN NOT MATCHED THEN
    INSERT (sku, quantity) VALUES (src.sku, src.quantity)
  RETURNING
    old.quantity AS qty_before,
    new.quantity AS qty_after;
```

### 5.2 Anti-Patterns

```sql
-- ❌ PG17 pattern — requires a separate SELECT for audit; race-prone
BEGIN;
SELECT price INTO old_price FROM products WHERE id = $1;
UPDATE products SET price = price * 1.10 WHERE id = $1;
-- old_price and new price retrieved in two steps — TOCTOU window
COMMIT;

-- ✅ PG18 pattern — atomic, no race condition
UPDATE products SET price = price * 1.10 WHERE id = $1
  RETURNING old.price, new.price;
```

---

## 6. Temporal Constraints

### 6.1 Syntax and Use Cases

Temporal constraints (for `PRIMARY KEY`, `UNIQUE`, `FOREIGN KEY`) enforce
uniqueness over ranges — ideal for slowly changing dimension tables,
SCD Type 2 patterns, and validity-period modeling.

```sql
-- Temporal UNIQUE constraint: no overlapping validity periods per entity
CREATE TABLE employee_salaries (
  employee_id INT        NOT NULL,
  salary      NUMERIC    NOT NULL,
  valid_from  DATE       NOT NULL,
  valid_until DATE,
  -- No two rows for the same employee may have overlapping [valid_from, valid_until)
  UNIQUE (employee_id, valid_from, valid_until) DEFERRABLE INITIALLY IMMEDIATE
);

-- Temporal PRIMARY KEY: SCD Type 2 pattern
CREATE TABLE product_prices (
  product_id  INT    NOT NULL,
  price       NUMERIC NOT NULL,
  effective   DATERANGE NOT NULL,
  PRIMARY KEY (product_id, effective) -- range-aware uniqueness
);

-- Temporal FOREIGN KEY: referential integrity over time
CREATE TABLE contract_line_items (
  contract_id  INT       NOT NULL,
  product_id   INT       NOT NULL,
  line_period  DATERANGE NOT NULL,
  FOREIGN KEY (product_id, line_period) REFERENCES product_prices(product_id, effective)
);
```

### 6.2 Querying Temporal Data

```sql
-- Find salary valid at a specific date
SELECT employee_id, salary
FROM employee_salaries
WHERE employee_id = 42
  AND valid_from <= '2026-01-01'
  AND (valid_until IS NULL OR valid_until > '2026-01-01');

-- Ranges overlap detection
SELECT * FROM product_prices
WHERE product_id = 10
  AND effective && '[2026-01-01, 2026-06-01)'::daterange;
```

---

## 7. Skip Scan & Query Optimization

### 7.1 Skip Scan on Multicolumn B-Tree Indexes

PG18 adds skip scan: the query planner can use a multicolumn B-tree index even
when the leading column lacks an `=` predicate. **Enabled automatically — no
configuration needed.** Works only with `=` operator on trailing columns;
inequalities and ranges on the leading column do not trigger skip scan.

```sql
-- Index on (status, created_at)
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- ❌ PG17: full table scan (no equality on leading column 'status')
EXPLAIN ANALYZE
SELECT order_id, created_at FROM orders WHERE created_at > '2026-01-01';

-- ✅ PG18: skip scan utilizes the index — planner traverses distinct 'status'
--           values and probes 'created_at' range within each group
EXPLAIN ANALYZE
SELECT order_id, created_at FROM orders WHERE created_at > '2026-01-01';
-- Look for: "Index Searches: N" in EXPLAIN output (N = distinct status values)

-- Skip scan effectiveness depends on cardinality of leading column
-- Low-cardinality leading columns (e.g. status ∈ {pending, active, closed})
-- are ideal candidates. High-cardinality leading columns (e.g. user_id) negate benefit.
```

### 7.2 Automatic Self-Join Elimination

PG18 automatically removes unnecessary table self-joins.

```sql
-- PG18 optimizer will simplify this automatically:
SELECT a.id, a.name FROM employees a
JOIN employees b ON a.id = b.id  -- redundant self-join

-- Equivalent result without the join — PG18 detects and removes it

-- Disable if you observe unexpected plan changes:
SET enable_self_join_elimination = OFF;
-- Re-enable:
SET enable_self_join_elimination = ON;
```

### 7.3 OR/IN Optimization

```sql
-- PG18 converts IN (VALUES ...) to x = ANY(...) for better stats
-- PG18 converts OR-clauses to arrays for index processing
-- Both are automatic — verify with EXPLAIN

-- ❌ PG17-era workaround no longer needed:
SELECT * FROM orders WHERE status = ANY(ARRAY['pending', 'processing', 'shipped']);
-- PG18 handles: WHERE status IN ('pending', 'processing', 'shipped') equally well
```

### 7.4 EXPLAIN ANALYZE — Buffer Reporting Now Default

```sql
-- PG18: EXPLAIN ANALYZE automatically includes buffer statistics
EXPLAIN ANALYZE SELECT * FROM large_table WHERE col > 100;
-- Output includes: "Buffers: shared hit=X read=Y"
-- No longer need EXPLAIN (ANALYZE, BUFFERS) for buffer info

-- For maximum detail (still valid):
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;
```

---

## 8. Indexes

### 8.1 B-Tree Index Design for PG18

```sql
-- ✅ Design multicolumn indexes with skip scan in mind
-- Put LOW-cardinality columns first (for skip scan benefit on trailing cols)
-- Put HIGH-selectivity columns where equality is common

CREATE INDEX idx_orders_composite ON orders(
  status,        -- low cardinality: skip scan driver
  created_at,    -- high selectivity: range filter
  customer_id    -- additional filter
);

-- ❌ ANTI-PATTERN: high-cardinality leading column defeats skip scan
CREATE INDEX idx_bad ON orders(customer_id, status);
-- Skip scan won't help on 'status' because customer_id has high cardinality

-- Partial indexes remain highly effective
CREATE INDEX idx_pending_orders ON orders(created_at)
  WHERE status = 'pending';
```

### 8.2 Expression Indexes for Virtual Columns

```sql
-- Virtual generated columns are NOT indexable — use expression indexes
CREATE TABLE users (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile  JSONB NOT NULL,
  email    TEXT GENERATED ALWAYS AS (profile ->> 'email') VIRTUAL
);

-- ✅ Index the underlying expression, not the virtual column
CREATE INDEX idx_users_email ON users((profile ->> 'email'));

-- Query uses the expression index automatically
SELECT * FROM users WHERE profile ->> 'email' = 'user@example.com';
```

### 8.3 Full-Text Search with STORED Generated Columns

```sql
CREATE TABLE articles (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title   TEXT NOT NULL,
  body    TEXT NOT NULL,
  lang    TEXT NOT NULL DEFAULT 'english',
  fts_vec TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', body),  'B')
  ) STORED
);

CREATE INDEX idx_articles_fts ON articles USING GIN(fts_vec);

-- Query
SELECT id, title, ts_rank(fts_vec, q) AS rank
FROM articles, plainto_tsquery('english', 'postgresql performance') q
WHERE fts_vec @@ q
ORDER BY rank DESC
LIMIT 20;

-- NOTE: After pg_upgrade, rebuild GIN indexes for full-text search
-- The release notes recommend REINDEX for pg_trgm and FTS indexes post-upgrade
REINDEX INDEX CONCURRENTLY idx_articles_fts;
```

---

## 9. Security & Authentication

### 9.1 SCRAM-SHA-256 (Required — MD5 Deprecated)

```ini
# postgresql.conf
password_encryption = scram-sha-256  # DEFAULT should be set explicitly
```

```ini
# pg_hba.conf — replace all 'md5' with 'scram-sha-256'
# TYPE  DATABASE  USER   ADDRESS     METHOD
host    all       all    127.0.0.1/32  scram-sha-256
host    all       all    ::1/128       scram-sha-256
hostssl all       all    0.0.0.0/0     scram-sha-256
```

```sql
-- Audit: find all roles still using MD5 hashes
SELECT rolname, left(rolpassword, 10) AS hash_prefix
FROM pg_authid
WHERE rolpassword LIKE 'md5%'
  AND rolcanlogin = TRUE;

-- Migrate MD5 role to SCRAM
SET password_encryption = 'scram-sha-256';
ALTER ROLE legacy_user WITH PASSWORD 'new_strong_password';
```

### 9.2 OAuth 2.0 Authentication (New in PG18)

```ini
# pg_hba.conf
host all all 0.0.0.0/0 oauth issuer="https://auth.example.com" scope="openid profile"
```

```ini
# postgresql.conf — load OAuth validator library
oauth_validator_libraries = 'my_oauth_validator'

# TLS configuration for OAuth token validation
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file  = '/etc/ssl/private/server.key'
```

```sql
-- Verify OAuth configuration
SELECT name, setting FROM pg_settings WHERE name LIKE 'oauth%';
```

### 9.3 TLS Configuration

```ini
# postgresql.conf
ssl = on
ssl_min_protocol_version = 'TLSv1.2'  # minimum; prefer TLSv1.3
ssl_tls13_ciphers = 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256'
ssl_prefer_server_ciphers = on
```

### 9.4 Privilege Inspection with pg_get_acl()

```sql
-- PG18: unified ACL inspection across all object types
-- Previously required querying pg_class, pg_proc, pg_namespace separately

-- Inspect privileges on a table
SELECT pg_get_acl('my_schema.my_table', 'table');

-- Inspect schema privileges
SELECT pg_get_acl('my_schema', 'schema');

-- Inspect function privileges
SELECT pg_get_acl('my_schema.my_function(int)', 'function');

-- Audit: find tables with public access
SELECT schemaname, tablename, pg_get_acl(schemaname || '.' || tablename, 'table')
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND pg_get_acl(schemaname || '.' || tablename, 'table') LIKE '%PUBLIC%';
```

### 9.5 Row Level Security

```sql
-- Always enable RLS on multi-tenant tables
ALTER TABLE tenant_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data FORCE ROW LEVEL SECURITY;  -- applies to table owner too

CREATE POLICY tenant_isolation ON tenant_data
  USING (tenant_id = current_setting('app.tenant_id')::BIGINT);

-- ❌ NEVER disable RLS for convenience
ALTER TABLE tenant_data DISABLE ROW LEVEL SECURITY;  -- exposes all tenants' data
```

### 9.6 Schema Permissions (CVE-2025-12817 Mitigation)

```sql
-- CVE-2025-12817: table owners in PG18.0 could create statistics in any schema
-- Fixed in PG18.1. Ensure you're on 18.3.
-- Audit: find statistics created in unexpected schemas
SELECT stxname, stxnamespace::regnamespace, stxrelid::regclass
FROM pg_statistic_ext
WHERE stxnamespace NOT IN (
  SELECT oid FROM pg_namespace WHERE nspname IN ('public', 'pg_catalog')
);

-- Restrict schema CREATE privileges explicitly
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CREATE ON SCHEMA app_schema TO app_role;
```

---

## 10. Schema Design Best Practices

### 10.1 Identity Columns (Preferred over SERIAL)

```sql
-- ✅ PG18 best practice: GENERATED AS IDENTITY (SQL-standard)
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

-- ❌ DEPRECATED pattern (SERIAL is shorthand for a sequence + default)
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY
);

-- BIGINT is mandatory for production tables — INT overflows at ~2.1B rows
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- NOT: id INT GENERATED ALWAYS AS IDENTITY  -- overflows at 2.1B
```

### 10.2 Timestamp Columns

```sql
-- ✅ ALWAYS use TIMESTAMPTZ (stores UTC, displays in session timezone)
CREATE TABLE orders (
  id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ❌ NEVER use TIMESTAMP WITHOUT TIME ZONE for business data
-- It is ambiguous when data crosses timezones

-- Trigger for updated_at (still manual in plain PG — no auto-update column)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 10.3 Naming Conventions

```sql
-- ✅ snake_case for all identifiers (PostgreSQL folds unquoted to lowercase)
CREATE TABLE order_line_items (...);
CREATE INDEX idx_order_line_items_order_id ON order_line_items(order_id);

-- ❌ CamelCase requires quoting everywhere — avoid
CREATE TABLE "OrderLineItems" (...);  -- must always be quoted in queries

-- ✅ Prefix indexes with idx_, constraints with chk_, fk_, pk_, uq_
ALTER TABLE orders ADD CONSTRAINT chk_positive_total CHECK (total > 0);
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id);
```

### 10.4 JSONB Best Practices

```sql
-- ✅ Use JSONB (binary), not JSON (text)
CREATE TABLE events (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payload JSONB NOT NULL
);

-- Index specific paths for frequent lookups
CREATE INDEX idx_events_type    ON events((payload ->> 'type'));
CREATE INDEX idx_events_user_id ON events((payload -> 'user' ->> 'id'));

-- GIN for arbitrary key search
CREATE INDEX idx_events_gin ON events USING GIN(payload);

-- Use virtual generated columns for clean access to JSONB fields
ALTER TABLE events
  ADD COLUMN event_type TEXT GENERATED ALWAYS AS (payload ->> 'type') VIRTUAL;
```

---

## 11. Query Patterns

### 11.1 Pagination

```sql
-- ✅ Cursor-based (keyset) pagination — O(log n), scales to millions of rows
SELECT id, created_at, name
FROM orders
WHERE id > $last_seen_id   -- or: (created_at, id) > ($last_ts, $last_id)
ORDER BY id ASC
LIMIT 50;

-- ❌ OFFSET pagination — O(n), degrades linearly, inconsistent under writes
SELECT * FROM orders ORDER BY id LIMIT 50 OFFSET 100000;  -- full scan to offset

-- With UUIDv7 primary keys, cursor pagination is naturally ordered by time
SELECT * FROM orders WHERE id > $cursor_uuid ORDER BY id LIMIT 50;
```

### 11.2 CTEs

```sql
-- ✅ PG18: non-data-modifying CTEs inline by default (as of PG12+)
-- Use MATERIALIZED to force isolation when needed
WITH recent_orders AS MATERIALIZED (
  SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT customer_id, COUNT(*) FROM recent_orders GROUP BY customer_id;

-- ✅ Writable CTEs — use RETURNING OLD/NEW for audit
WITH updated AS (
  UPDATE products SET price = price * 1.1
  WHERE category = 'electronics'
  RETURNING product_id, old.price AS old_price, new.price AS new_price
)
INSERT INTO price_audit_log (product_id, old_price, new_price, changed_at)
SELECT product_id, old_price, new_price, NOW() FROM updated;
```

### 11.3 EXPLAIN Workflow

```sql
-- Step 1: Identify slow queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > INTERVAL '5 seconds';

-- Step 2: Analyze plan — PG18 buffers included automatically
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;

-- Step 3: Look for:
--   Seq Scan on large tables (missing index)
--   Index Searches: N  (skip scan — verify N is small)
--   Buffers: shared read=HIGH  (cold cache or I/O bound)
--   actual rows >> estimated rows  (stale statistics)

-- Step 4: Update statistics if estimates are wrong
ANALYZE orders;
-- Or adjust statistics target for a column with high variance
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 500;
ANALYZE orders;
```

---

## 12. Autovacuum & Maintenance

### 12.1 New PG18 Autovacuum Parameters

```ini
# postgresql.conf

# NEW in PG18: cap maximum autovacuum worker processes at runtime
autovacuum_worker_slots = 16    # max slots (requires restart to increase)
autovacuum_max_workers  = 8     # can be changed at runtime up to autovacuum_worker_slots

# NEW in PG18: fixed dead-tuple threshold that triggers autovacuum
# Prevents large tables from accumulating excessive dead tuples before vacuuming
autovacuum_vacuum_max_threshold = 1000000  # trigger if dead tuples > 1M (regardless of %)

# Existing tuning (still applies)
autovacuum_vacuum_scale_factor   = 0.01   # 1% of table (down from default 0.2)
autovacuum_analyze_scale_factor  = 0.005  # 0.5% triggers ANALYZE
autovacuum_vacuum_cost_limit     = 400    # increase for fast I/O systems (AIO benefit)
```

### 12.2 Bloat Monitoring

```sql
-- Monitor table bloat
SELECT schemaname, tablename,
  n_dead_tup,
  n_live_tup,
  round(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_pct,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY dead_pct DESC;

-- Trigger manual vacuum on high-bloat tables
VACUUM ANALYZE high_bloat_table;
VACUUM (FULL, ANALYZE) critical_table;  -- full rewrite — use with caution on large tables
```

---

## 13. Replication & High Availability

### 13.1 Logical Replication Compatibility in PG18

```sql
-- Logical replication now supports STORED generated columns
-- VIRTUAL generated columns remain incompatible with logical replication

-- On publisher: confirm generated column is STORED
SELECT attname, attgenerated  -- 's' = stored, '' = not generated
FROM pg_attribute
WHERE attrelid = 'my_table'::regclass AND attgenerated <> '';

-- Create publication including STORED generated columns
CREATE PUBLICATION pub_my_table FOR TABLE my_table;
-- STORED generated column values are replicated as regular column data

-- ❌ Do NOT replicate tables where you need virtual column values transmitted
-- Create a STORED version of the derived column for replication needs
```

### 13.2 pg_createsubscriber Enhancements

```bash
# NEW in PG18: --all flag creates logical replicas for all databases
pg_createsubscriber --all --publisher-server="host=primary port=5432"

# NEW in PG18: --clean removes publications on publisher after setup
pg_createsubscriber --clean ...

# NEW in PG18: --enable-two-phase enables prepared transactions
pg_createsubscriber --enable-two-phase ...
```

### 13.3 Streaming Replication — Wire Protocol 3.2

```ini
# postgresql.conf — enable protocol 3.2 for replica connections
# (libpq defaults to 3.0; update client drivers to opt in to 3.2)
# No explicit configuration required on server — negotiated automatically

# Verify protocol version in use
SELECT application_name, backend_type, query
FROM pg_stat_replication;
```

---

## 14. Monitoring & Observability

### 14.1 Key System Views in PG18

```sql
-- NEW in PG18: async I/O state
SELECT * FROM pg_aios;

-- Connection and activity monitoring
SELECT pid, usename, application_name, state, wait_event_type, wait_event,
       now() - query_start AS query_age, query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY query_age DESC;

-- Lock monitoring
SELECT pid, mode, granted, relation::regclass, query
FROM pg_locks l
JOIN pg_stat_activity a USING (pid)
WHERE NOT granted;

-- Replication lag
SELECT application_name,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)) AS send_lag,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS replay_lag
FROM pg_stat_replication;

-- Table I/O stats — useful for validating AIO benefit
SELECT schemaname, tablename,
  heap_blks_read, heap_blks_hit,
  round(heap_blks_hit::numeric / NULLIF(heap_blks_read + heap_blks_hit, 0) * 100, 2) AS cache_hit_pct
FROM pg_statio_user_tables
ORDER BY heap_blks_read DESC;
```

### 14.2 pgBouncer Configuration for PG18

```ini
# pgbouncer.ini — calibrated for PG18 AIO
pool_mode            = transaction
default_pool_size    = 50    # PG18 AIO scales better with more concurrency
max_client_conn      = 1000
server_pool_mode     = session
server_idle_timeout  = 600
```

---

## 15. Wire Protocol 3.2

PG18 introduces protocol version 3.2 — the **first new wire protocol since PG 7.4 (2003)**.
`libpq` defaults to 3.0 for backward compatibility. Driver/pooler support for 3.2 is optional
but enables new protocol-level features.

```sql
-- Check active protocol version per connection
SELECT pid, application_name
FROM pg_stat_activity;
-- Protocol version visible in driver-level metadata (not exposed as SQL column in 18.0)

-- Upgrade path: update libpq-based drivers to opt in to 3.2
-- psycopg3, asyncpg, and node-postgres are adding 3.2 support
-- PgBouncer 1.24+ required for protocol 3.2 proxying
```

---

## 16. Known Issues & CVE Mitigations

| Version | Issue | Severity | Mitigation |
|---------|-------|----------|------------|
| 18.0 | **CVE-2025-12817**: Table owners could create statistics in any schema, causing naming conflicts | Medium | Upgrade to 18.1+; audit `pg_statistic_ext` |
| 18.0 | **libpq integer overflow** in allocation-size calculations — undersized buffer on large input | High | Upgrade to 18.1+ |
| 18.2 | **Standby freeze** — hot-standby replicas freeze under certain workloads | Critical | Upgrade to 18.3 immediately |
| 18.2 | **pg_trgm crash** — similarity queries crash server process | High | Upgrade to 18.3 |
| 18.2 | **substring encoding errors** — incorrect results on multi-byte encodings | High | Upgrade to 18.3 |
| 18.2 | **PL/pgSQL composite-type casting** — stored procedures fail silently | Medium | Upgrade to 18.3 |
| 18.x | **AIO checkpoint storms** — periodic perf degradation at checkpoint intervals | Medium | Tune `checkpoint_completion_target = 0.9`, `max_wal_size = 4GB` |
| 18.x | **effective_io_concurrency overconfig** — performance regression vs PG17 | Medium | Match to storage queue depth (gp3: ≤150, NVMe: ≤256) |
| 18.x | **io_uring on non-Linux** — server fails to start | High | Use `io_method = worker` on macOS/Windows/non-Linux |
| 18.x | **Virtual columns + logical replication** — replication silently skips virtual column data | Medium | Use `STORED` for any column needing replication |
| 18.x | **FTS indexes after pg_upgrade** — GIN/pg_trgm indexes may need rebuild | Medium | `REINDEX INDEX CONCURRENTLY` FTS and trigram indexes post-upgrade |

---

## 17. Production Checklist

### Pre-Deployment

- [ ] Running PostgreSQL **18.3** (not 18.0/18.1/18.2 — each had CVEs or data regressions)
- [ ] `password_encryption = 'scram-sha-256'` in `postgresql.conf`
- [ ] All `md5` entries replaced with `scram-sha-256` in `pg_hba.conf`
- [ ] `ssl = on` with TLS ≥ 1.2 enforced
- [ ] `io_method` configured for OS and storage (Linux: `io_uring`; others: `worker`)
- [ ] `effective_io_concurrency` ≤ storage queue depth
- [ ] Data checksums verified (`SHOW data_checksums;` → `on`)
- [ ] RLS enabled on all multi-tenant tables

### Schema

- [ ] All generated columns explicitly marked `STORED` or `VIRTUAL`
- [ ] Virtual columns NOT in logical replication sets
- [ ] Primary keys use `uuidv7()` or `BIGINT GENERATED ALWAYS AS IDENTITY`
- [ ] No `SERIAL`/`INTEGER` PKs on large tables (BIGINT required)
- [ ] All timestamp columns are `TIMESTAMPTZ`
- [ ] FTS indexes rebuilt post `pg_upgrade` (`REINDEX INDEX CONCURRENTLY`)

### Performance

- [ ] `EXPLAIN ANALYZE` run on top-10 queries — no unexpected `Seq Scan` on large tables
- [ ] Multicolumn indexes designed with low-cardinality leading columns where skip scan applies
- [ ] `autovacuum_vacuum_max_threshold` set to prevent dead-tuple accumulation on large tables
- [ ] `autovacuum_worker_slots` and `autovacuum_max_workers` sized to workload
- [ ] `checkpoint_completion_target = 0.9` and `max_wal_size` tuned
- [ ] `pg_stat_user_tables` shows recent `last_autoanalyze` timestamps

### Security

- [ ] `REVOKE CREATE ON SCHEMA public FROM PUBLIC`
- [ ] `pg_get_acl()` audit run to identify unexpected public access
- [ ] `pg_statistic_ext` audited for statistics in unexpected schemas (CVE-2025-12817)
- [ ] OAuth `oauth_validator_libraries` configured if using OAuth auth
- [ ] `ssl_tls13_ciphers` set to approved cipher list

### Upgrade (PG17 → PG18)

- [ ] Checksum state verified on PG17 source cluster
- [ ] `pg_upgrade --jobs=N --swap` used for parallel and fast upgrade
- [ ] Post-upgrade statistics currency verified (`pg_stat_user_tables.last_analyze`)
- [ ] All timezone abbreviation usage audited (switch to IANA names or UTC offsets)
- [ ] MD5 roles identified and migrated to SCRAM
- [ ] `pg_trgm` and full-text search indexes rebuilt with `REINDEX INDEX CONCURRENTLY`
