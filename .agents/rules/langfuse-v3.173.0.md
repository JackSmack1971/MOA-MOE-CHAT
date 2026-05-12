---
trigger: model_decision
description: >
  Authoritative coding ruleset for Langfuse v3.173.0 (server) + Python SDK v3 (OTEL-native, GA June 2025).
  Covers SDK initialization, OTEL-based tracing primitives, prompt management, scoring, datasets,
  evaluation, self-hosting infrastructure, and migration from v2. Apply when instrumenting any
  LLM application with Langfuse observability or deploying/managing a self-hosted Langfuse v3 instance.
globs:
  - "**/*.py"
  - "**/langfuse*.py"
  - "**/tracing*.py"
  - "**/observability*.py"
  - "docker-compose*.yml"
  - "helm/*.yaml"
  - ".env*"
---

# Langfuse v3.173.0 Rules

> **Version matrix (as of May 2026)**
> | Component | Version | Notes |
> |---|---|---|
> | Langfuse Server | 3.173.0 | Docker image `langfuse/langfuse:3` |
> | Langfuse Worker | 3.173.0 | Docker image `langfuse/langfuse-worker:3` |
> | Python SDK | v3 (OTEL-native, GA) | `pip install langfuse>=3` |
> | JS/TS SDK | v4 (OTEL-native) | `npm install @langfuse/tracing @langfuse/otel` |
> | ClickHouse | ≥ 24.3 | OLAP storage for traces/observations/scores |
> | Redis / Valkey | ≥ 7 | Queue + cache; **must** have `maxmemory-policy=noeviction` |
>
> **Platform compatibility gate:** Python SDK v3 requires Langfuse platform ≥ 3.125.0.
> Server v3.173.0 satisfies this requirement.

---

## 1. Architecture Overview (v3)

Langfuse v3 replaces the single-container Postgres-only v2 architecture with a distributed,
multi-component system optimized for high-throughput LLM observability.

```
SDK (Python / JS)
  │ async OTLP export
  ▼
langfuse-web:3000        ← REST API + Console UI
  │ writes events to S3, reference to Redis queue
  ▼
langfuse-worker:3030     ← Background processor
  │ reads from Redis/S3
  ▼
ClickHouse               ← Traces, observations, scores (OLAP)
PostgreSQL               ← Auth, projects, prompts, settings
Redis / Valkey           ← Queue (BullMQ) + prompt/API-key cache
S3 / Blob Store          ← Raw event persistence + large objects
```

**Critical invariants:**
- ClickHouse AND PostgreSQL **must** run with timezone=UTC. Non-UTC causes empty/incorrect queries.
- Redis **must** have `maxmemory-policy noeviction`. Eviction breaks BullMQ job queue.
- S3 bucket: disable versioning and deletion lifecycle policies; enable only aborted-multipart-upload cleanup.
- Web and Worker containers both require the same set of env vars (see §6).

---

## 2. SDK Installation and Initialization

### 2.1 Python SDK v3

```bash
pip install langfuse>=3,<4   # Pin major; v4 is a breaking rewrite
```

**Mandatory environment variables:**
```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # or self-hosted URL
# Optional but recommended:
LANGFUSE_ENVIRONMENT=production   # categorize traces
LANGFUSE_RELEASE=v1.2.3          # link traces to releases
LANGFUSE_SAMPLE_RATE=1.0         # 0.0–1.0; reduce for high-volume prod
LANGFUSE_DEBUG=False             # set True for local debugging only
```

**Initialization pattern — prefer `get_client()` singleton:**
```python
from langfuse import Langfuse, get_client

# Option A: singleton via env vars (RECOMMENDED for production)
langfuse = get_client()   # Returns the global client; initializes from env on first call

# Option B: explicit init (use when multi-client or custom config needed)
langfuse = Langfuse(
    public_key="pk-lf-...",
    secret_key="sk-lf-...",
    base_url="https://cloud.langfuse.com",
    environment="production",
    release="v1.2.3",
    sample_rate=1.0,
    debug=False,
)

# ALWAYS flush before process exit in short-lived apps (Lambda, scripts)
langfuse.flush()

# In long-lived apps, shutdown() is called automatically at process exit
# but call it explicitly in tests and one-shot jobs:
langfuse.shutdown()
```

**Anti-pattern — never create a new Langfuse instance per request:**
```python
# ❌ WRONG: creates a new OTEL provider per request, leaks resources
def handle_request():
    lf = Langfuse(public_key=..., secret_key=...)  # Don't do this

# ✅ CORRECT: module-level singleton
langfuse = get_client()

def handle_request():
    with langfuse.start_as_current_observation(as_type="span", name="request"):
        ...
```

### 2.2 Multi-client setup (advanced)

```python
from langfuse import Langfuse

# Separate clients per project
client_a = Langfuse(public_key="pk-a-...", secret_key="sk-a-...")
client_b = Langfuse(public_key="pk-b-...", secret_key="sk-b-...")

# @observe uses get_client() — works automatically in single-client setups
# In multi-client setups, ensure the correct client is active for each call
```

---

## 3. Tracing — Core Patterns

Langfuse v3 SDK is built on **OpenTelemetry (OTEL)**. Context propagation is automatic.
Traces are implicitly created by the first (root) span or generation.

### 3.1 `@observe` Decorator (preferred high-level API)

```python
from langfuse import observe, get_client

langfuse = get_client()

@observe(name="user-request-pipeline")
def handle_user_request(user_query: str, user_id: str) -> str:
    # Enrich the trace with user-level attributes
    langfuse.update_current_trace(
        user_id=user_id,
        session_id="session-abc",
        tags=["production", "v1"],
        metadata={"source": "api"},
    )

    result = process_data(user_query)
    langfuse.update_current_span(output={"final_result": result})
    return result

@observe(name="data-processing-step")
def process_data(query: str) -> str:
    # Automatically a child span of handle_user_request due to OTEL context
    with langfuse.start_as_current_observation(
        as_type="generation",
        name="llm-call",
        model="gpt-4o",
        input=[{"role": "user", "content": query}],
    ) as generation:
        response = "42"  # your LLM call here
        generation.update(
            output=response,
            usage_details={"input_tokens": 15, "output_tokens": 8},
        )
    return response
```

**`@observe` options:**
```python
@observe(
    name="my-span",           # Override span name (default: function name)
    as_type="generation",     # "span" (default) | "generation" | "event"
    capture_input=True,       # Default True; set False for PII or large inputs
    capture_output=True,      # Default True; set False for binary/large outputs
    transform_to_string=None, # Callable to serialize non-string outputs
)
```

### 3.2 Context Manager API (low-level, explicit control)

```python
from langfuse import get_client, propagate_attributes

langfuse = get_client()

with langfuse.start_as_current_observation(
    as_type="span",
    name="root-span",
    input={"query": "Hello"},
) as root_span:

    # Propagate trace-level attributes to all child observations
    with propagate_attributes(
        user_id="user_123",
        session_id="session_456",
        tags=["experiment"],
    ):
        with langfuse.start_as_current_observation(
            as_type="generation",
            name="llm-call",
            model="gpt-4o",
            model_parameters={"temperature": 0.7, "max_tokens": 512},
            input=[{"role": "user", "content": "Hello"}],
        ) as generation:
            # ... LLM call ...
            generation.update(
                output="Hello back!",
                usage_details={"input_tokens": 10, "output_tokens": 5},
                cost_details={"input": 0.00003, "output": 0.00010},
            )

        # Override trace-level input/output explicitly
        root_span.update_trace(
            input={"query": "Hello"},
            output={"response": "Hello back!"},
        )
```

### 3.3 Manual span lifecycle (requires explicit `.end()`)

```python
# Use ONLY when context managers are not viable
span = langfuse.start_observation(
    as_type="span",
    name="my-span",
    input={"key": "value"},
)
try:
    # ... work ...
    span.update(output={"result": "done"})
finally:
    span.end()  # MANDATORY — missing .end() causes missing/open traces
```

### 3.4 Observation types reference

| Langfuse Type | OTEL Concept | Use For |
|---|---|---|
| `span` | OTel Span | Non-LLM operations (retrieval, parsing, tool calls) |
| `generation` | OTel Span + LLM attrs | LLM API calls — adds model, tokens, cost fields |
| `event` | Point-in-time OTel event | Instantaneous events (cache hit, classification result) |

### 3.5 Trace attributes (set via `update_current_trace` or `propagate_attributes`)

```python
langfuse.update_current_trace(
    name="my-trace",           # Human-readable trace name
    user_id="user_123",        # Max 200 chars
    session_id="session_456",  # Max 200 chars — groups traces into sessions
    metadata={"key": "value"}, # dict[str, str] — values max 200 chars in v4+
    tags=["prod", "v2"],       # List of string labels
    public=False,              # Expose trace via public share link
)
```

---

## 4. Framework Integrations

### 4.1 OpenAI (auto-instrumentation)

```python
from langfuse.openai import openai  # Drop-in replacement

# All openai calls are automatically traced as Langfuse generations
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
```

### 4.2 LangChain

```python
from langfuse.langchain import CallbackHandler

handler = CallbackHandler()  # Auto-reads env vars

# Pass as callback to any LangChain runnable
chain.invoke({"input": "..."}, config={"callbacks": [handler]})

# To associate with a specific trace:
from langfuse import get_client, propagate_attributes

langfuse = get_client()
with langfuse.start_as_current_observation(as_type="span", name="lc-trace"):
    with propagate_attributes(user_id="user_123"):
        chain.invoke({"input": "..."}, config={"callbacks": [handler]})
```

**Breaking change from v2:** `langfuse_context.update_current_trace()` is removed.
Use `propagate_attributes()` context manager instead.

### 4.3 LlamaIndex (via OpenInference)

```python
from openinference.instrumentation.llama_index import LlamaIndexInstrumentor
from langfuse import get_client

LlamaIndexInstrumentor().instrument()  # Must be called before first LlamaIndex import
langfuse = get_client()

with langfuse.start_as_current_observation(as_type="span", name="rag-query"):
    response = query_engine.query("What is RAG?")
langfuse.flush()
```

### 4.4 Anthropic (via OTEL instrumentation)

```python
from opentelemetry.instrumentation.anthropic import AnthropicInstrumentor
AnthropicInstrumentor().instrument()
# All Anthropic API calls are now captured in Langfuse traces
```

---

## 5. Prompt Management

### 5.1 Fetching prompts (with client-side caching)

```python
from langfuse import get_client

langfuse = get_client()

# Fetch latest production prompt (cached client-side, revalidated in background)
prompt = langfuse.get_prompt("my-prompt")

# Fetch specific version
prompt = langfuse.get_prompt("my-prompt", version=3)

# Fetch by label
prompt = langfuse.get_prompt("my-prompt", label="production")

# Compile with variables
compiled = prompt.compile(topic="machine learning", language="English")
```

### 5.2 Linking traces to prompt versions

```python
# Attach prompt metadata to a generation for performance tracking
with langfuse.start_as_current_observation(
    as_type="generation",
    name="llm-call",
    model="gpt-4o",
    input=compiled,
    metadata={"langfuse_prompt": prompt.to_json()},  # Links generation to prompt version
) as generation:
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=compiled,
    )
    generation.update(output=response.choices[0].message.content)
```

### 5.3 Creating / updating prompts via SDK

```python
langfuse.create_prompt(
    name="my-prompt",
    prompt="You are a helpful assistant. Answer: {{question}}",
    config={"model": "gpt-4o", "temperature": 0.7},
    labels=["production"],
)
```

---

## 6. Scoring

### 6.1 Programmatic scores

```python
from langfuse import get_client

langfuse = get_client()

# Score a trace
langfuse.create_score(
    trace_id="trace-id-here",
    name="quality",
    value=0.85,             # Numeric: float; or string for categorical
    comment="Good answer",  # Optional human-readable comment
)

# Score a specific observation within a trace
langfuse.create_score(
    trace_id="trace-id-here",
    observation_id="observation-id-here",
    name="faithfulness",
    value=1.0,
)

# Categorical score (string value)
langfuse.create_score(
    trace_id="trace-id-here",
    name="sentiment",
    value="positive",      # Must be string for categorical
    data_type="CATEGORICAL",
)
```

### 6.2 Model-based evaluation loop

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Fetch generations from a named pipeline step
generations = langfuse.get_generations(name="my-generation-name").data

for gen in generations:
    score_value = run_eval(gen.input, gen.output)  # your eval function

    langfuse.create_score(
        trace_id=gen.trace_id,
        observation_id=gen.id,
        name="hallucination",
        value=score_value["score"],
        comment=score_value["reasoning"],
    )
```

**Breaking change:** `/api/public/scores` endpoint is now asynchronous in v3 (returns `{id: string}`, not the full score object). Evaluate scores via the UI or re-fetch.

---

## 7. Datasets and Experiments

```python
from langfuse import get_client

langfuse = get_client()

# Create dataset
dataset = langfuse.create_dataset(name="qa-eval-set")

# Add items
langfuse.create_dataset_item(
    dataset_name="qa-eval-set",
    input={"question": "What is LangFuse?"},
    expected_output={"answer": "An LLM observability platform."},
    metadata={"category": "definition"},
)

# Run experiment (v3 pattern with context manager)
dataset = langfuse.get_dataset("qa-eval-set")

for item in dataset.items:
    with item.run(
        run_name="gpt-4o-baseline",
        run_metadata={"model": "gpt-4o"},
    ) as span:
        output = my_llm_function(item.input)
        span.update(output=output)
        # Score against expected output
        span.score(
            name="exact_match",
            value=1.0 if output == item.expected_output else 0.0,
        )
```

---

## 8. Self-Hosting Configuration

### 8.1 Required environment variables (Web + Worker containers)

```bash
# === REQUIRED ===
DATABASE_URL=postgresql://user:pass@host:5432/langfuse
NEXTAUTH_URL=https://your-langfuse-domain.com
NEXTAUTH_SECRET=<openssl rand -hex 32>
SALT=<openssl rand -hex 16>
ENCRYPTION_KEY=<openssl rand -hex 32>   # Must be exactly 64 hex chars

# ClickHouse
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_USER=clickhouse
CLICKHOUSE_PASSWORD=<strong-password>
CLICKHOUSE_MIGRATION_URL=clickhouse://clickhouse:9000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_AUTH=<strong-password>
# OR: REDIS_CONNECTION_STRING=redis://default:pass@host:6379/0

# S3 / Blob Storage
LANGFUSE_S3_EVENT_UPLOAD_BUCKET=my-langfuse-bucket
LANGFUSE_S3_EVENT_UPLOAD_REGION=us-east-1
LANGFUSE_S3_EVENT_UPLOAD_ACCESS_KEY_ID=AKIA...
LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY=...

# === OPTIONAL BUT RECOMMENDED ===
LANGFUSE_ENABLE_EVENTS_TABLE_UI=true   # v3.173.0: enable events UI table
NODE_OPTIONS=--max-old-space-size=4096  # Memory limit for Node.js
```

### 8.2 Docker Compose skeleton (production-grade)

```yaml
version: "3.8"
services:
  langfuse-web:
    image: langfuse/langfuse:3
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      SALT: ${SALT}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      CLICKHOUSE_URL: http://clickhouse:8123
      CLICKHOUSE_USER: clickhouse
      CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD}
      CLICKHOUSE_MIGRATION_URL: clickhouse://clickhouse:9000
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_AUTH: ${REDIS_AUTH}
      LANGFUSE_S3_EVENT_UPLOAD_BUCKET: ${S3_BUCKET}
      LANGFUSE_S3_EVENT_UPLOAD_REGION: ${S3_REGION}
      LANGFUSE_S3_EVENT_UPLOAD_ACCESS_KEY_ID: ${S3_ACCESS_KEY}
      LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY: ${S3_SECRET_KEY}
    depends_on:
      - clickhouse
      - redis
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 4G

  langfuse-worker:
    image: langfuse/langfuse-worker:3
    restart: unless-stopped
    ports:
      - "3030:3030"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      SALT: ${SALT}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      CLICKHOUSE_URL: http://clickhouse:8123
      CLICKHOUSE_USER: clickhouse
      CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_AUTH: ${REDIS_AUTH}
      LANGFUSE_S3_EVENT_UPLOAD_BUCKET: ${S3_BUCKET}
      LANGFUSE_S3_EVENT_UPLOAD_REGION: ${S3_REGION}
      LANGFUSE_S3_EVENT_UPLOAD_ACCESS_KEY_ID: ${S3_ACCESS_KEY}
      LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY: ${S3_SECRET_KEY}
    depends_on:
      - clickhouse
      - redis

  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    restart: unless-stopped
    environment:
      CLICKHOUSE_DB: default
      CLICKHOUSE_USER: clickhouse
      CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD}
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    # CRITICAL: Ensure UTC timezone
    env_file:
      - .env

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --requirepass ${REDIS_AUTH}
      --maxmemory-policy noeviction
    volumes:
      - redis_data:/data

volumes:
  clickhouse_data:
  redis_data:
```

### 8.3 ClickHouse configuration mandates

- Minimum version: **24.3**
- Cluster mode: set `CLICKHOUSE_CLUSTER_ENABLED=true` and optionally `CLICKHOUSE_CLUSTER_NAME` (default: `default`)
- S3 disk for ClickHouse: do NOT enable bucket versioning; do NOT set deletion lifecycle policies
- Enable lifecycle policy only for **aborted multipart uploads**
- Disk encryption available via `AES_128_CTR` for local storage; cloud blob storage uses provider-default encryption

### 8.4 Redis configuration mandates

```
maxmemory-policy noeviction   # REQUIRED — eviction breaks BullMQ queue
```

Minimum version: **Redis 7** or **Valkey 7**.

---

## 9. Known Issues and Mitigations

| Issue | Root Cause | Mitigation |
|---|---|---|
| **HTTP 308 redirect loop** (self-hosted, `status_code: 308`) | LANGFUSE_BASE_URL uses `http://` but server redirects to `https://` | Ensure `LANGFUSE_BASE_URL` uses `https://` and matches server TLS config exactly |
| **Traces not appearing** | Missing `flush()` / `shutdown()` before process exit | Call `langfuse.flush()` (scripts/Lambda) or `langfuse.shutdown()` (long-lived apps) at exit |
| **"No active span in current context"** warning | Async generators lose OTEL context across yield boundaries | Capture all updates inside the `@observe` function body before yielding; do not update trace after `async for` completes |
| **Async generator output shows `<async_generator>`** | `@observe` uses `inspect.isgenerator()` which returns `False` for async generators | Use `transform_to_string` parameter on `@observe` or capture output manually inside the generator before yielding |
| **Parallel execution: spans not nested** | OTEL context not propagated across concurrent tasks (ThreadPool, asyncio, Temporal) | Use `copy_context()` from `contextvars` and run tasks via `ctx.run(task)` to propagate context |
| **PostgreSQL "cannot connect"** in Docker | Containers not on the same Docker network | Ensure all containers share a named Docker network; use service name (not `localhost`) as host |
| **ClickHouse empty query results** | Timezone not set to UTC | Set `TZ=UTC` and `CLICKHOUSE_TZ=UTC` in ClickHouse container; verify with `SELECT timezone()` |
| **`langfuse_context` import error** | `langfuse_context` was v2 API; removed in v3 | Use `langfuse.update_current_trace()` or `propagate_attributes()` from `langfuse` package |
| **`fetch_traces` AttributeError** | v2 method removed in v3 | Use `langfuse.get_traces()` with filter parameters |
| **Third-party OTEL spans inflating traces** | v3 captures all OTEL spans including DB/HTTP infra | Filter with `blocked_instrumentation_scopes` (v3) or `should_export_span` (v4) |
| **`update_trace` parameter TypeError** (datasets) | `DatasetItem.run(update_trace=...)` removed in v4 | Use `propagate_attributes()` instead; for v3, `update_trace` still works |
| **Pydantic v1 compatibility** | Python SDK v3+ requires Pydantic v2 | Add `pydantic>=2` to dependencies; or use `pydantic.v1` shim if legacy code requires v1 |

---

## 10. Migration Guide: v2 → v3

### 10.1 SDK migration checklist

| v2 Pattern | v3 Pattern |
|---|---|
| `from langfuse.decorators import langfuse_context, observe` | `from langfuse import observe, get_client` |
| `langfuse_context.update_current_trace(user_id=...)` | `langfuse.update_current_trace(user_id=...)` |
| `langfuse_context.flush()` | `langfuse.flush()` |
| `langfuse.trace()` / `.span()` / `.generation()` (object API) | `langfuse.start_as_current_observation(as_type=...)` or `@observe` |
| Manual trace/span ID passing | Automatic OTEL context propagation — no manual IDs needed |
| `langfuse.get_generations(name=...).data` | Same — still works in v3 |
| `from langfuse.callback import CallbackHandler` (LangChain) | `from langfuse.langchain import CallbackHandler` |

### 10.2 Server infrastructure additions (v2 → v3)

v3 requires **three new infrastructure components** that do not exist in v2:

1. **ClickHouse** — replaces Postgres for trace/observation/score storage
2. **Redis/Valkey** — BullMQ queue + prompt/API key cache
3. **S3/Blob Store** — raw event persistence + large object storage
4. **Langfuse Worker container** — async event processor (new container)

**Migration path:**
1. Provision ClickHouse, Redis, and S3 (managed services recommended)
2. Deploy new web + worker containers with v3 env vars
3. Point SDK to new deployment
4. Langfuse runs a background migration to copy historical data from Postgres → ClickHouse
5. Monitor migration completion before decommissioning v2 containers

> ⚠️ SDKs below version 2.0.0 are incompatible with Langfuse server v3. Upgrade SDK before migrating server.

---

## 11. Async and Threading Best Practices

### 11.1 FastAPI / async functions

```python
from langfuse import observe, get_client
from fastapi import FastAPI

app = FastAPI()
langfuse = get_client()

@app.get("/chat")
@observe(name="chat-endpoint")
async def chat(query: str, user_id: str):
    langfuse.update_current_trace(user_id=user_id)
    result = await generate_response(query)
    return {"response": result}

@app.on_event("shutdown")
async def shutdown():
    langfuse.flush()
```

### 11.2 ThreadPoolExecutor — context propagation

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextvars import copy_context
from langfuse import observe, get_client

langfuse = get_client()

@observe(name="parallel-task")
def run_task(item: str) -> str:
    return f"processed: {item}"

@observe(name="parallel-pipeline")
def run_parallel(items: list[str]) -> list[str]:
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        for item in items:
            ctx = copy_context()  # Capture OTEL context for each thread
            futures.append(executor.submit(ctx.run, run_task, item))
        return [f.result() for f in as_completed(futures)]

result = run_parallel(["a", "b", "c"])
langfuse.flush()
```

### 11.3 AWS Lambda / serverless

```python
import json
from langfuse import observe, get_client

langfuse = get_client()

@observe(name="lambda-handler")
def handler(event, context):
    result = process(event["body"])
    return {"statusCode": 200, "body": json.dumps(result)}

def lambda_handler(event, context):
    response = handler(event, context)
    langfuse.flush()  # REQUIRED: flush before Lambda container freezes
    return response
```

---

## 12. Sampling and Cost Control

```python
from langfuse import Langfuse

# Sample 10% of traces in production (reduces cost/storage)
langfuse = Langfuse(sample_rate=0.1)

# Or via environment variable:
# LANGFUSE_SAMPLE_RATE=0.1
```

**Filtering third-party OTEL spans (prevent infra noise):**

```python
from langfuse import Langfuse

# Block specific instrumentation scopes from appearing in Langfuse
langfuse = Langfuse(
    blocked_instrumentation_scopes={"sqlite", "requests", "urllib3", "httpx"}
)
```

---

## 13. Debugging and Observability

```python
# Enable verbose SDK debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

langfuse = Langfuse(debug=True)
# Or: LANGFUSE_DEBUG=True env var

# Verify credentials synchronously (not for production — blocking call)
langfuse.auth_check()
```

**Debug checklist when traces are missing:**
1. Confirm env vars: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`
2. Enable `debug=True` — check for `Startup: Langfuse tracer successfully initialized`
3. Confirm `flush()` is called before process exit
4. Verify `LANGFUSE_BASE_URL` uses correct scheme (`https://` not `http://` for TLS)
5. Self-hosted: confirm platform version ≥ 3.125.0 for Python SDK v3 compatibility
6. Check Docker network — all containers must share the same network

---

## 14. Security and Production Checklist

- [ ] `ENCRYPTION_KEY` is exactly 64 hex chars (`openssl rand -hex 32`)
- [ ] `NEXTAUTH_SECRET` and `SALT` are cryptographically random
- [ ] ClickHouse and Postgres credentials are rotated from defaults
- [ ] Redis `maxmemory-policy=noeviction` is explicitly set
- [ ] S3 bucket versioning is **disabled**; only aborted-upload lifecycle policy is enabled
- [ ] All storage components (ClickHouse, Postgres) run with `timezone=UTC`
- [ ] `LANGFUSE_BASE_URL` uses HTTPS in production
- [ ] `LANGFUSE_SAMPLE_RATE` is set appropriately for volume (avoid 1.0 at high throughput)
- [ ] `capture_input=False` / `capture_output=False` on `@observe` for PII-sensitive functions
- [ ] SDK `debug=False` in production (`LANGFUSE_DEBUG=False`)
- [ ] `langfuse.flush()` called in Lambda/serverless handlers before container freeze
- [ ] Web container has at least 2 replicas for high availability
- [ ] CPU autoscaling threshold set at 50% utilization

---

## 15. Version and Update Tracking

- **Server releases:** `https://github.com/langfuse/langfuse/releases`
- **Python SDK releases:** `https://github.com/langfuse/langfuse-python/releases`
- **Breaking change policy:** Major version bumps only for breaking API/behavior changes; minor versions are safe to apply automatically
- **SDK ↔ Server compatibility:** SDKs can run against newer server versions; new SDK features may require recent server versions
- **Python SDK v3 → v4 migration:** v4 introduces `propagate_attributes()` as replacement for `update_current_trace()`, observation-centric data model, and removes several types from `langfuse.types`. Do not upgrade without reviewing the [v3 → v4 migration guide](https://langfuse.com/docs/observability/sdk/upgrade-path/python-v3-to-v4).
- **Ruleset last validated:** May 2026 against Langfuse server 3.173.0 and Python SDK v3 GA (June 2025)
