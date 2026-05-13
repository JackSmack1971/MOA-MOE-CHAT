---
trigger: model_decision
description: >
  Comprehensive rules for integrating with the OpenRouter API (v1.0.0, OpenAPI 3.1.0).
  Covers authentication, model routing, provider fallbacks, streaming (SSE), tool use,
  structured outputs, cost tracking, error handling, and the Responses API. Apply whenever
  generating code that calls https://openrouter.ai/api/v1/*.
globs:
  - "**/*openrouter*"
  - "**/lib/llm*"
  - "**/services/ai*"
  - "**/api/chat*"
  - "**/config/models*"
---

# OpenRouter API Rules

> **Source:** OpenRouter OpenAPI 3.1.0 spec + official docs (openrouter.ai/docs) — validated May 2026.
> **Base URL:** `https://openrouter.ai/api/v1`
> **Spec:** `https://openrouter.ai/openapi.json`

---

## 1. Authentication and Required Headers

- **ALWAYS** pass `Authorization: Bearer <OPENROUTER_API_KEY>` — no other auth scheme is accepted.
- **ALWAYS** include `Content-Type: application/json` on POST requests.
- **RECOMMENDED:** Include `HTTP-Referer` (your app URL) and `X-Title` (your app name) to attribute usage and appear in the OpenRouter marketplace leaderboard. `X-OpenRouter-Title` is also accepted as an alias for `X-Title`.
- **OPTIONAL:** Include `X-OpenRouter-Categories` to assign marketplace categories for discoverability.

```typescript
// ✅ Correct: complete header setup
const headers = {
  "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "https://your-app.com",   // recommended
  "X-Title": "Your App Name",                // recommended
};

// ❌ Wrong: missing auth or wrong format
const headers = { "X-API-Key": process.env.OPENROUTER_API_KEY }; // rejected
```

- **NEVER** hardcode API keys — always read from environment variables.
- **BYOK (Bring Your Own Key):** Set keys via the OpenRouter integrations dashboard; BYOK requests report `usage.is_byok: true` and inherit provider-native rate limits, not OpenRouter's pool.

---

## 2. Model Selection and Naming

- **ALWAYS** include the provider prefix in model IDs: `"openai/gpt-4o"`, `"anthropic/claude-3-5-sonnet"`, `"google/gemini-pro"`.
- Omitting `model` falls back to the user/payer default — **avoid** in production code.
- **Model suffixes change routing behavior:**

| Suffix     | Effect                                               | Use Case                         |
|------------|------------------------------------------------------|----------------------------------|
| `:free`    | Routes to shared free-tier pool (20 RPM / 200 RPD)  | Development, testing only        |
| `:nitro`   | Routes to fastest/highest-throughput provider        | Latency-sensitive workloads      |
| `:extended`| Routes to providers with extended context support    | Long-document processing         |
| *(none)*   | Default routing — cost/latency balanced              | General production use           |

```python
# ✅ Development: free tier
model = "google/gemini-flash-1.5:free"

# ✅ Production: latency-optimized
model = "openai/gpt-4o:nitro"

# ✅ Production: balanced
model = "anthropic/claude-3-5-sonnet"
```

- **List available models** via `GET /models` — always validate model strings from this endpoint rather than hardcoding.
- Check model capability flags in the `/models` response: `supports_tools`, `supports_vision`, `context_length`, `pricing`.

---

## 3. Chat Completions API (Primary Endpoint)

**Endpoint:** `POST /chat/completions`

### 3.1 Request Structure

```typescript
interface ChatCompletionRequest {
  model: string;                    // required: "provider/model-id"
  messages: Message[];              // required
  stream?: boolean;                 // optional, default false
  max_tokens?: number;              // optional; set to prevent runaway costs
  temperature?: number;             // 0.0–2.0
  top_p?: number;
  frequency_penalty?: number;       // -2.0 to 2.0
  presence_penalty?: number;        // -2.0 to 2.0
  stop?: string | string[];
  tools?: Tool[];
  tool_choice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  response_format?: ResponseFormat;
  provider?: ProviderPreferences;   // OpenRouter-specific routing
  models?: string[];                // OpenRouter-specific fallback list
  transforms?: string[];            // OpenRouter-specific transforms
  user?: string;                    // end-user identifier for abuse detection
}
```

### 3.2 Message Roles

- Valid roles: `"system"`, `"user"`, `"assistant"`, `"tool"`.
- System messages should precede user messages. Not all models support `"system"` — check model page.
- For tool results, use role `"tool"` with `tool_call_id` matching the original call.

```typescript
const messages = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "What is 2+2?" },
  // After tool call:
  { role: "assistant", content: null, tool_calls: [...] },
  { role: "tool", tool_call_id: "call_abc123", content: "4" },
];
```

### 3.3 Multimodal Content

- Vision: pass `content` as an array with `type: "image_url"` items. Only supported models accept this.
- **PDF inputs:** Send as `type: "file"` with a public URL or base64-encoded data. Available August 2025+.
- **Audio inputs:** `type: "input_audio"` with `data` (base64) and `format` (`"mp3"` or `"wav"`). Available August 2025+.

```typescript
// ✅ Vision input
const message = {
  role: "user",
  content: [
    { type: "text", text: "Describe this image." },
    { type: "image_url", image_url: { url: "https://example.com/img.jpg", detail: "auto" } }
  ]
};

// detail options: "auto" | "high" | "low"
// Use "low" to reduce token cost for simple visual checks
```

---

## 4. Provider Routing

OpenRouter-specific routing is configured via the `provider` field in the request body.

### 4.1 Provider Preferences Object

```typescript
interface ProviderPreferences {
  order?: string[];                 // preferred provider order (e.g., ["Anthropic", "OpenAI"])
  allow_fallbacks?: boolean;        // default true — disable for strict provider lock
  require_parameters?: boolean;     // only use providers that support all request parameters
  data_collection?: "allow" | "deny"; // opt-out of provider training data
  only?: string[];                  // whitelist specific providers
  ignore?: string[];                // blacklist specific providers
  quantizations?: string[];         // e.g., ["fp16", "bf16"] — filter by weight precision
  sort?: "price" | "throughput" | "latency"; // routing optimization axis
  partition?: "model" | "none";     // "none" enables cross-model endpoint sorting
}
```

```typescript
// ✅ Cost-optimized routing with fallback
const provider = {
  sort: "price",
  allow_fallbacks: true,
  data_collection: "deny",         // GDPR / privacy-sensitive workloads
};

// ✅ Strict provider with no fallback (e.g., compliance requirement)
const provider = {
  only: ["Anthropic"],
  allow_fallbacks: false,
};

// ✅ Throughput-optimized for high-volume batch
const provider = {
  sort: "throughput",
  quantizations: ["fp16", "bf16"],  // exclude quantized endpoints
};
```

### 4.2 Model Fallback Chains

Use the top-level `models` array to define ordered fallback chains. OpenRouter tries each in sequence on failure.

```typescript
// ✅ High-availability fallback chain
const body = {
  model: "anthropic/claude-3-5-sonnet",       // primary
  models: [
    "anthropic/claude-3-5-sonnet",
    "openai/gpt-4o",
    "google/gemini-1.5-pro",
  ],
  messages: [...],
};

// ❌ Anti-pattern: no fallback in production
const body = {
  model: "anthropic/claude-3-5-sonnet",  // single point of failure
  messages: [...],
};
```

- **Fallback is automatic on 5xx or rate-limit responses** from the upstream provider.
- When `models` array is used, set `provider.partition: "none"` to allow cross-model endpoint sorting.

### 4.3 Performance Preferences

```typescript
// Prefer low-latency (TTFT) providers — soft preference, not guaranteed
const provider = {
  preferred_max_latency: 1000,       // milliseconds TTFT target
};

// Prefer high-throughput providers — soft preference
const provider = {
  preferred_min_throughput: 100,     // tokens/second target
};
```

**Warning:** `preferred_max_latency` and `preferred_min_throughput` are preferences, not hard limits. They filter candidates but never block a request.

---

## 5. Streaming (SSE)

### 5.1 Enabling Streaming

```typescript
// ✅ Correct: stream: true in request body
const body = { model: "...", messages: [...], stream: true };

const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers,
  body: JSON.stringify(body),
});
```

### 5.2 SSE Event Parsing

- The stream emits `data: {...}` lines followed by `data: [DONE]`.
- **CRITICAL:** SSE streams occasionally emit `:` comment lines (e.g., `: OPENROUTER PROCESSING`). **Always filter these out** — they are not JSON and will cause parse errors.
- Each chunk has `choices[0].delta.content` for text, or `choices[0].delta.tool_calls` for tool streaming.

```typescript
// ✅ Correct SSE parser with comment filtering
async function* parseSSE(response: Response): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith(":")) continue;           // ✅ skip SSE comments
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try {
        const chunk = JSON.parse(data);
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // Malformed chunk — log and skip
        console.warn("Failed to parse SSE chunk:", data);
      }
    }
  }
}
```

### 5.3 Debug Mode (Streaming Only)

- Send `debug: { echo_upstream_body: true }` in the request to inspect how OpenRouter transforms your payload before sending to the provider.
- The first chunk will have an empty `choices` array and a `debug` field with the upstream request body.
- **Only works with `stream: true` on the Chat Completions API.** Not available on non-streaming or Responses API.

```typescript
const body = {
  model: "openai/gpt-4o",
  messages: [...],
  stream: true,
  debug: { echo_upstream_body: true },  // dev/debug only — remove in production
};
```

---

## 6. Tool Use / Function Calling

### 6.1 Standard Function Tools

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City and state" },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
        },
        required: ["location"],
      },
    },
  },
];

const body = {
  model: "openai/gpt-4o",
  messages,
  tools,
  tool_choice: "auto",        // "auto" | "none" | "required"
  parallel_tool_calls: true,  // allow multiple tool calls in one turn
};
```

### 6.2 Strict Structured Outputs

**CRITICAL:** To use `strict: true` on tool definitions, you **MUST** pass the `structured-outputs-2025-11-13` beta header. Without it, OpenRouter silently strips the `strict` field.

```typescript
// ✅ Correct: strict tool use with required header
const headers = {
  "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
  "anthropic-beta": "structured-outputs-2025-11-13",  // REQUIRED for strict: true
};

const tools = [
  {
    type: "function",
    name: "extract_user",
    strict: true,         // guarantees schema-compliant output
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, age: { type: "number" } },
      required: ["name", "age"],
      additionalProperties: false,  // required for strict mode
    },
  },
];
```

### 6.3 Server-Side Tools (Responses API)

OpenRouter provides server-managed tools that don't require client-side execution:

```typescript
// Web search tool — engine selection
const webSearchTool = {
  type: "web_search",
  engine: "auto",       // "auto" | "native" | "exa"
  max_results: 5,       // 1–25, only applies to "exa" engine
  search_context_size: "medium",  // "low" | "medium" | "high"
  filters: {
    allowed_domains: ["wikipedia.org", "arxiv.org"],
    excluded_domains: ["reddit.com"],
  },
};

// File search against vector store
const fileSearchTool = {
  type: "file_search",
  vector_store_ids: ["vs_abc123"],
  max_num_results: 20,  // 1–50
};

// MCP tool integration
const mcpTool = {
  type: "mcp",
  server_label: "my-mcp-server",
  server_url: "https://my-mcp.example.com/sse",
  require_approval: "never",  // "never" | "always"
};

// Image generation tool
const imageGenTool = {
  type: "image_generation",
  quality: "high",       // "low" | "medium" | "high" | "auto"
  size: "1024x1024",     // "1024x1024" | "1024x1536" | "1536x1024" | "auto"
  output_format: "png",  // "png" | "webp" | "jpeg"
};
```

### 6.4 Handling Tool Calls in Response

```typescript
// ✅ Complete tool call loop
async function runWithTools(messages: Message[]): Promise<string> {
  while (true) {
    const response = await fetch("/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, tools, tool_choice: "auto" }),
    });
    const data = await response.json();
    const choice = data.choices[0];

    if (choice.finish_reason === "tool_calls") {
      // Append assistant message with tool calls
      messages.push(choice.message);

      // Execute each tool and append results
      for (const toolCall of choice.message.tool_calls) {
        const result = await executeLocalTool(toolCall);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
      continue; // loop for model to process results
    }

    return choice.message.content; // finish_reason === "stop"
  }
}
```

---

## 7. Structured Outputs (Response Format)

```typescript
// JSON schema response format
const body = {
  model: "openai/gpt-4o",
  messages,
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "product_info",
      strict: true,
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          in_stock: { type: "boolean" },
        },
        required: ["name", "price", "in_stock"],
        additionalProperties: false,
      },
    },
  },
};

// ❌ Anti-pattern: prompting for JSON without response_format
// Prone to formatting errors and inconsistent output
const body = {
  messages: [{ role: "user", content: "Return JSON with name and price" }],
};
```

---

## 8. Responses API (Stateful, Multi-Turn)

**Endpoint:** `POST /responses`

The Responses API is a newer, stateful alternative to Chat Completions with richer output types.

### 8.1 Basic Request

```typescript
const body = {
  model: "openai/gpt-4o",
  input: "What is the capital of France?",   // string or structured input array
  max_output_tokens: 1000,
  store: true,                               // persist response for multi-turn
};

// Structured input
const body = {
  model: "anthropic/claude-3-5-sonnet",
  input: [
    { role: "user", content: [{ type: "input_text", text: "Summarize this." }] }
  ],
};
```

### 8.2 Multi-Turn via `previous_response_id`

```typescript
// Turn 1
const resp1 = await callResponsesAPI({ model, input: "Hello!" });

// Turn 2: continue the conversation
const resp2 = await callResponsesAPI({
  model,
  input: "What did I just say?",
  previous_response_id: resp1.id,   // links turns without resending history
});
```

### 8.3 Response Output Parsing

The `output` array contains typed items — always check `type` before accessing fields:

```typescript
for (const item of response.output) {
  switch (item.type) {
    case "message":
      for (const part of item.content) {
        if (part.type === "output_text") console.log(part.text);
        if (part.type === "refusal") console.warn("Refusal:", part.refusal);
      }
      break;
    case "reasoning":
      // thinking/chain-of-thought from o-series or extended thinking models
      for (const summary of item.summary) {
        console.log("Reasoning summary:", summary.text);
      }
      break;
    case "function_call":
      await handleFunctionCall(item);  // item.name, item.arguments, item.call_id
      break;
    case "web_search_call":
      console.log("Search status:", item.status);  // "completed" | "searching" | ...
      break;
    case "image_generation_call":
      if (item.result) {
        const imageBuffer = Buffer.from(item.result, "base64");
      }
      break;
  }
}
```

### 8.4 Responses API Streaming Events

When `stream: true`, events arrive with a `sequence_number` for ordering:

```typescript
// Key event types to handle
const eventHandlers: Record<string, Function> = {
  "response.created":            (e) => initUI(e.response.id),
  "response.output_text.delta":  (e) => appendText(e.delta),       // streaming text
  "response.output_text.done":   (e) => finalizeText(e.text),
  "response.function_call_arguments.delta": (e) => bufferArgs(e.delta),
  "response.function_call_arguments.done":  (e) => executeCall(e),
  "response.reasoning_text.delta": (e) => showThinking(e.delta),   // reasoning models
  "response.completed":          (e) => handleCompletion(e.response),
  "response.failed":             (e) => handleError(e.response.error),
  "response.incomplete":         (e) => handleIncomplete(e.response),
  "error":                       (e) => handleStreamError(e),       // stream-level error
};
```

### 8.5 Reasoning Configuration

```typescript
// Configure reasoning effort for o-series / extended thinking models
const body = {
  model: "openai/o3",
  input: "...",
  reasoning: {
    effort: "high",        // "xhigh" | "high" | "medium" | "low" | "minimal" | "none"
    summary: "detailed",   // "auto" | "concise" | "detailed"
  },
};
```

---

## 9. Cost and Usage Tracking

- **Chat Completions:** `response.usage` contains `prompt_tokens`, `completion_tokens`, `total_tokens`.
- **Responses API:** Extended `usage` with `cost`, `is_byok`, and `cost_details`:

```typescript
interface ExtendedUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  input_tokens_details: { cached_tokens: number };
  output_tokens_details: { reasoning_tokens: number };
  cost?: number;                          // total cost in USD
  is_byok?: boolean;                      // true if using your own provider key
  cost_details?: {
    upstream_inference_cost?: number;     // provider-side cost (if available)
    upstream_inference_input_cost: number;
    upstream_inference_output_cost: number;
  };
}
```

- **Always log `usage.cost`** in production to track spend per request.
- **Set `max_tokens`** on all requests to bound maximum cost per call.
- **Retrieve generation details** via `GET /generation?id={generation_id}` for post-hoc cost audit.

```typescript
// ✅ Cost-aware request
const body = {
  model: "openai/gpt-4o",
  messages,
  max_tokens: 2000,   // hard cap — prevents runaway responses
};

// ✅ Post-request cost logging
function logCost(response: any): void {
  const usage = response.usage;
  console.log({
    model: response.model,
    input_tokens: usage?.prompt_tokens,
    output_tokens: usage?.completion_tokens,
    cost_usd: usage?.cost ?? "N/A",
    cached_tokens: usage?.input_tokens_details?.cached_tokens ?? 0,
  });
}
```

---

## 10. Error Handling

### 10.1 HTTP Status Codes

| Code | Meaning                          | Action                                              |
|------|----------------------------------|-----------------------------------------------------|
| 200  | Success                          | Parse response normally                             |
| 400  | Bad request / invalid params     | Fix request schema; check `error.message`           |
| 401  | Invalid/missing API key          | Check `OPENROUTER_API_KEY` environment variable     |
| 402  | Insufficient credits             | Top up credits at openrouter.ai/credits             |
| 403  | Moderation / content policy      | Review `error.metadata` for flagged content details |
| 408  | Request timeout                  | Reduce prompt size or increase timeout              |
| 429  | Rate limit exceeded              | Honor `Retry-After` header; implement exponential backoff |
| 502  | Provider returned bad response   | Retry or use fallback model                         |
| 503  | Provider unavailable             | Retry after delay; configure fallback chain         |

### 10.2 Error Response Shape

```typescript
// Chat Completions error
{
  error: {
    code: number,          // HTTP status
    message: string,       // human-readable description
    metadata?: {
      // When flagged by moderation:
      reasons?: string[],
      flagged_input?: string,
      // When provider error:
      provider_name?: string,
      raw?: object,        // raw provider error
    }
  }
}
```

### 10.3 Retry Pattern with Backoff

```typescript
// ✅ Production retry handler
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;

      if (status === 429 || status === 503) {
        if (attempt === maxRetries) throw err;
        const retryAfter = parseInt(err?.headers?.["retry-after"] ?? "0", 10);
        const delay = retryAfter > 0
          ? retryAfter * 1000
          : Math.min(1000 * 2 ** attempt + Math.random() * 1000, 30_000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // 4xx (except 429): non-retryable
      throw err;
    }
  }
  throw new Error("Unreachable");
}
```

### 10.4 Empty Content Handling

Models occasionally return empty content on cold start (provider warm-up):

```typescript
// ✅ Detect and handle empty content
function extractContent(response: any): string {
  const content = response.choices?.[0]?.message?.content;
  if (!content || content.trim() === "") {
    // Provider cold start — retry once or switch provider
    throw new EmptyContentError("Model returned empty content — retry or switch provider");
  }
  return content;
}
```

---

## 11. Rate Limits

### 11.1 Free Tier Limits

- **`:free` model variants:** 20 requests/minute, 200 requests/day (shared pool across all users).
- **Free account (no credits):** 50 free model requests/day.
- **Free account (≥10 credits purchased):** 1,000 free model requests/day.
- **CRITICAL:** Failed requests still count against daily quota on free tier.

### 11.2 Paid Tier Limits

- No hard RPM/RPD limits set by OpenRouter for paid models.
- Rate limits are inherited from upstream providers (Anthropic, OpenAI, etc.).
- Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` are returned when limits apply.

### 11.3 Rate Limit Headers

```typescript
// Always read and respect rate limit headers
function checkRateLimitHeaders(response: Response): void {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");
  const retryAfter = response.headers.get("Retry-After");

  if (remaining === "0" && reset) {
    const resetMs = parseInt(reset) - Date.now();
    console.warn(`Rate limit hit. Resets in ${Math.ceil(resetMs / 1000)}s`);
  }
}
```

---

## 12. Privacy and Data Governance

- Set `provider.data_collection: "deny"` to opt out of provider training data on each request.
- Enable **Zero Data Retention (ZDR)** at the account level for maximum privacy — configurable in the OpenRouter dashboard.
- The `user` field in requests is passed to providers for abuse detection — use stable, anonymized identifiers only.
- **Do not** include PII in `metadata` fields; metadata values have a 512-character limit and may be logged.

```typescript
// ✅ Privacy-first configuration
const body = {
  model: "anthropic/claude-3-5-sonnet",
  messages,
  user: crypto.randomUUID(),           // anonymized per-session ID
  provider: {
    data_collection: "deny",           // opt out of training data
  },
};
```

---

## 13. OpenAI SDK Drop-In Configuration

```typescript
// ✅ Drop-in using official openai package
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://your-app.com",
    "X-Title": "Your App Name",
  },
});

// Usage is identical to OpenAI SDK
const response = await client.chat.completions.create({
  model: "anthropic/claude-3-5-sonnet",
  messages: [{ role: "user", content: "Hello" }],
  max_tokens: 500,
});
```

```python
# Python drop-in
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://your-app.com",
        "X-Title": "Your App Name",
    },
)
```

---

## 14. Known Issues and Mitigations

| Issue | Root Cause | Mitigation |
|-------|-----------|------------|
| **Empty response content** | Provider cold start / model warm-up (can take seconds–minutes) | Retry once with exponential backoff; switch provider if persistent |
| **SSE comment lines cause JSON parse errors** | OpenRouter injects `: OPENROUTER PROCESSING` keep-alive comments into the stream | Filter lines starting with `:` before JSON parsing |
| **`strict: true` silently dropped from tool schemas** | Requires `structured-outputs-2025-11-13` header; OpenRouter strips it without error if absent | Always add the beta header when using `strict: true` on tools |
| **429 with `:free` models, no actual rate limit hit** | Shared free-tier pool exhausted by other users; failed requests still count | Use paid tier in production; implement fallback to non-free model variant |
| **Provider 429 mis-attributed as OR 429** | Upstream provider rate-limit propagated through OR error response | Check `error.metadata.provider_name` to distinguish OR vs upstream limits |
| **Tool call arguments arrive incomplete in stream** | `function_call_arguments.delta` events must be concatenated before parsing | Buffer all `delta` events; only parse JSON after `function_call_arguments.done` |
| **Reasoning models timeout without keep-alive** | OR cancels fetch if no output received for extended period | For o-series / thinking models, use streaming; providers must send SSE keep-alives |
| **`model` field in response does not match request** | OR routes to a different endpoint within a provider family | Log `response.model` (not just request model) for accurate cost attribution |
| **BYOK rate limits differ from OR docs** | BYOK bypasses OR rate limit pooling; limits come from your provider account | Validate BYOK limits directly with each provider; `usage.is_byok: true` confirms |

---

## 15. Anti-Patterns

```typescript
// ❌ No max_tokens — unbounded cost risk
const body = { model: "openai/gpt-4o", messages };

// ✅ Always set max_tokens
const body = { model: "openai/gpt-4o", messages, max_tokens: 2000 };

// ❌ Hardcoded API key
const headers = { Authorization: "Bearer sk-or-v1-abc123..." };

// ✅ Environment variable
const headers = { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` };

// ❌ No fallback in production
const body = { model: "anthropic/claude-3-5-sonnet", messages };

// ✅ Fallback chain
const body = {
  model: "anthropic/claude-3-5-sonnet",
  models: ["anthropic/claude-3-5-sonnet", "openai/gpt-4o"],
  messages,
};

// ❌ Using :free suffix in production
const model = "openai/gpt-4o:free";  // 20 RPM / 200 RPD cap

// ✅ Paid tier for production
const model = "openai/gpt-4o";

// ❌ Blocking retry without backoff
while (true) {
  const res = await callAPI();   // hammers on 429
}

// ✅ Exponential backoff with Retry-After respect
await callWithRetry(() => callAPI(), 3);

// ❌ Parsing SSE without comment filtering
const chunk = JSON.parse(line.replace("data: ", ""));  // fails on ": OPENROUTER PROCESSING"

// ✅ Filter comments before parsing
if (line.startsWith(":")) continue;
```

---

## 16. Production Checklist

- [ ] API key stored in environment variable, never hardcoded or committed
- [ ] `HTTP-Referer` and `X-Title` headers included on all requests
- [ ] `max_tokens` set on all requests to cap cost
- [ ] Fallback `models` array defined for all production endpoints
- [ ] SSE parser filters `:` comment lines before JSON parsing
- [ ] Retry logic respects `Retry-After` header with exponential backoff
- [ ] `error.metadata` logged on non-200 responses for debugging
- [ ] `response.model` logged (not just request model) for accurate attribution
- [ ] `usage.cost` tracked per request for spend monitoring
- [ ] `provider.data_collection: "deny"` set for privacy-sensitive workloads
- [ ] Empty content responses handled with retry or provider switch
- [ ] `structured-outputs-2025-11-13` header added when using `strict: true` on tools
- [ ] `:free` model variants restricted to development/testing environments only
- [ ] Tool call argument buffers flushed only after `function_call_arguments.done` event
- [ ] Generation IDs stored if post-hoc cost audit is required (`GET /generation?id=...`)

---

## 17. Key Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chat/completions` | POST | OpenAI-compatible text generation |
| `/responses` | POST | Stateful Responses API (multi-turn, richer outputs) |
| `/responses/{id}` | GET | Retrieve stored response by ID |
| `/responses/{id}` | DELETE | Cancel in-progress response |
| `/models` | GET | List available models with capabilities and pricing |
| `/generation` | GET | Get generation details by ID (cost, tokens, provider) |
| `/auth/key` | GET | Validate API key and retrieve account info |
| `/credits` | GET | Check credit balance |

---

*Last validated: May 2026 — always cross-reference against [openrouter.ai/docs](https://openrouter.ai/docs) and the live spec at [openrouter.ai/openapi.json](https://openrouter.ai/openapi.json) as the platform evolves rapidly.*
