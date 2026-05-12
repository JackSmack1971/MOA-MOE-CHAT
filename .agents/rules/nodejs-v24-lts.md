---
trigger: model_decision
description: >
  Comprehensive coding rules for Node.js v24.x LTS (codename "Jod", LTS since
  24.11.0, current patch 24.15.0). Covers ESM/CJS interop, async patterns,
  HTTP/WebSocket, built-in SQLite, crypto, streams, permission model, test
  runner, deprecation removals, known CVEs, and production checklists.
  Apply to all server-side JavaScript/TypeScript targeting Node.js v24.
globs:
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
  - "**/*.ts"
  - "**/Dockerfile"
  - "**/.nvmrc"
  - "**/.node-version"
  - "**/package.json"
version_info:
  node: "24.15.0"
  lts_codename: "Jod"
  lts_since: "24.11.0"
  lts_eol: "2028-04-30"
  v8: "13.6"
  npm: "11.x"
  openssl: "3.5"
  undici: "7.0.0"
sources:
  - https://nodejs.org/docs/latest-v24.x/api/
  - https://nodejs.org/en/blog/migrations/v22-to-v24
  - https://nodejs.org/en/blog/vulnerability/july-2025-security-releases
  - https://nodejs.org/en/blog/vulnerability/december-2025-security-releases
  - https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V24.md
last_updated: "2026-05-10"
---

# Node.js v24 LTS Rules

## 1. Module System — ESM / CJS Interop

### 1.1 Always use the `node:` protocol prefix for built-in imports
Every built-in module import **must** use the `node:` scheme. The bare-specifier
form still works but is considered legacy and may be deprecated in a future major.

```js
// ✅ CORRECT
import { readFile } from 'node:fs/promises';
import { AsyncLocalStorage } from 'node:async_hooks';
const path = require('node:path');

// ❌ WRONG — bare specifier
import { readFile } from 'fs/promises';
const path = require('path');
```

### 1.2 `require()` of ES Modules is now stable
Since v22.12.0, synchronous `require()` of ESM files (without top-level `await`)
is stable and no longer requires a flag. Enable it implicitly by ensuring the
consumed ESM has no TLA.

```js
// consumer.cjs  — CJS file consuming ESM
const { helper } = require('./helper.mjs'); // ✅ works if helper.mjs has no TLA
```

> **Constraint:** If the ESM file contains top-level `await`, `require()` will
> throw `ERR_REQUIRE_ASYNC_MODULE`. Use dynamic `import()` instead.

```js
// ✅ safe fallback for ESM with TLA
const { helper } = await import('./helper-with-tla.mjs');
```

### 1.3 Package `exports` field takes priority over `main`
Always define `exports` in `package.json`. Omitting it exposes your entire
package directory to consumers.

```json
{
  "name": "my-pkg",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./utils": "./dist/utils.mjs"
  }
}
```

### 1.4 `.nvmrc` / `.node-version` pinning
```
24.15.0
```
Use `engines` in `package.json` to enforce the floor:
```json
{
  "engines": { "node": ">=24.15.0" }
}
```

---

## 2. Async Patterns

### 2.1 Prefer `AsyncLocalStorage` over `AsyncResource` for request context
`AsyncLocalStorage` is stable (since v16) and has zero-overhead context
propagation. The internal backend switched to `AsyncContextFrame` in v24 —
the public API is unchanged but edge cases in raw `async_hooks` may surface.

```js
import { AsyncLocalStorage } from 'node:async_hooks';

const requestCtx = new AsyncLocalStorage();

// HTTP middleware
app.use((req, res, next) => {
  requestCtx.run({ requestId: req.headers['x-request-id'] }, next);
});

// Anywhere downstream — no prop drilling needed
function logWithCtx(msg) {
  const ctx = requestCtx.getStore();
  console.log(`[${ctx?.requestId}] ${msg}`);
}
```

> **Known issue (Jan 2026 security release):** Deep recursion while
> `async_hooks.createHook()` is active can cause an **unrecoverable** process
> crash instead of reaching `uncaughtException`. Prefer `AsyncLocalStorage`
> (which does not have this issue) over raw `createHook()`. Validate and
> bound any recursion depth that could be influenced by untrusted input.

### 2.2 Explicit Resource Management — `using` / `await using`
ES2025 Explicit Resource Management is natively supported in v24 JS without
TypeScript (ensure tooling — ESLint, Babel — supports the syntax).

```js
// ✅ Synchronous cleanup
{
  using handle = openFileHandle('./data.bin');
  // handle[Symbol.dispose]() called automatically at block exit
}

// ✅ Async cleanup
{
  await using conn = await db.connect();
  // conn[Symbol.asyncDispose]() called automatically
}
```

Implement `[Symbol.dispose]` / `[Symbol.asyncDispose]` on resource objects
rather than relying on finalizers.

### 2.3 Async generators as first-class streams
Use `Readable.from()` to lift async generators into Node.js streams:

```js
import { Readable } from 'node:stream';

async function* dataSource(signal) {
  for (const item of largeDataset) {
    if (signal.aborted) break;
    yield item;
  }
}

const ac = new AbortController();
const readable = Readable.from(dataSource(ac.signal));
readable.on('close', () => ac.abort());
readable.pipe(destinationStream);
```

### 2.4 AbortController / AbortSignal for all long-running operations
Pass an `AbortSignal` into every fetch, file, stream, and timer operation.
Node.js v24 tightened `AbortSignal` validation — passing non-signal values
now throws `ERR_INVALID_ARG_TYPE`.

```js
const ac = new AbortController();
const timeout = AbortSignal.timeout(5000); // ✅ v17.3+ built-in helper
const signal = AbortSignal.any([ac.signal, timeout]);

const res = await fetch(url, { signal });
```

---

## 3. HTTP Client — Undici 7 / Fetch

### 3.1 Prefer `fetch()` / Undici 7 over the legacy `http` module
`fetch` is now backed by Undici 7.0.0, delivering ~30% faster throughput and
~40% lower memory at high concurrency compared to Undici 6.

```js
// ✅ Modern HTTP — uses Undici 7 internally
const res = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(10_000),
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
```

> **Breaking:** `fetch()` in v24 enforces stricter CORS behavior. Validate
> cross-origin requests after upgrading from v22.

### 3.2 Native WebSocket client (Undici 7)
No third-party `ws` dependency needed for client-side WebSocket:

```js
// ✅ Built-in WebSocket — globally available since v22, stable in v24
const ws = new WebSocket('wss://stream.example.com');

ws.addEventListener('open', () => ws.send(JSON.stringify({ type: 'subscribe' })));
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  console.log(msg);
});
ws.addEventListener('error', (err) => console.error('WS error:', err));
ws.addEventListener('close', ({ code, reason }) =>
  console.log(`Closed: ${code} ${reason}`)
);
```

> **Note:** Server-side WebSocket handling still requires a library (e.g.,
> `ws`, `uWebSockets.js`). The built-in `WebSocket` is a *client* implementation.

### 3.3 Reuse connections via `undici.Pool` for high-throughput services
If calling `undici` directly (not via `fetch`), use `Pool` to amortize
connection overhead:

```js
import { Pool } from 'undici';

const pool = new Pool('https://api.example.com', {
  connections: 10,
  pipelining: 1,
});

const { body } = await pool.request({
  path: '/v1/items',
  method: 'GET',
  headers: { authorization: `Bearer ${token}` },
});
const data = await body.json();
```

---

## 4. Built-in SQLite (`node:sqlite`)

### 4.1 Use `DatabaseSync` for embedded relational storage
Available since v22.5.0 (experimental), promoted to stable in v24:

```js
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:'); // or a file path

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  ) STRICT
`);

const insert = db.prepare('INSERT INTO users (name, role) VALUES (?, ?)');
insert.run('Alice', 'admin');

const select = db.prepare('SELECT * FROM users WHERE role = ?');
console.log(select.all('admin'));
// [ { id: 1, name: 'Alice', role: 'admin' } ]

db.close();
```

> ⚠️ **Performance regression (GitHub #60719, v24 / V8 13.6):** Native SQLite
> addons built on `better-sqlite3` may show up to **57% slower SELECT
> performance** vs v20 due to V8 13.6's move to a V8-owned CppHeap. If you
> rely on `better-sqlite3` for high-throughput reads, benchmark on v24 first.
> The built-in `node:sqlite` is unaffected by this regression.

### 4.2 Always use `STRICT` tables and parameterised statements
```js
// ✅ Parameterised — prevents SQL injection and type coercion bugs
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
stmt.get(userId);

// ❌ NEVER interpolate user input into SQL strings
db.exec(`SELECT * FROM users WHERE id = ${userId}`);
```

---

## 5. Cryptography

### 5.1 OpenSSL 3.5 key-length floor (BREAKING)
Node.js 24 LTS defaults to OpenSSL 3.5 security level **2**:
- RSA, DSA, DH keys **< 2048 bits** → **rejected**
- ECC keys **< 224 bits** → **rejected**
- RC4 cipher suites → **rejected**

Test TLS handshakes and key operations before deploying. Rotate any short keys.

### 5.2 `generateKeyPair` RSA-PSS options renamed (DEP0154 → codemod available)
```js
// ❌ v22 — deprecated options (now throw in strict mode)
crypto.generateKeyPair('rsa-pss', {
  modulusLength: 2048,
  hash: 'sha256',       // ← deprecated
  mgf1Hash: 'sha1',    // ← deprecated
});

// ✅ v24 — renamed options
crypto.generateKeyPair('rsa-pss', {
  modulusLength: 2048,
  hashAlgorithm: 'sha256',
  mgf1HashAlgorithm: 'sha1',
  saltLength: 32,
});
```

Run the codemod automatically:
```bash
npx codemod run @nodejs/crypto-rsa-pss-update
```

### 5.3 Prefer WebCrypto for interoperability
Use the Web Crypto API (`crypto.subtle`) for algorithms that must also run in
browser or edge environments:

```js
const { subtle } = globalThis.crypto; // ✅ globally available in v24

const key = await subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  new TextEncoder().encode('secret')
);
```

### 5.4 HashDoS vulnerability (V8 13.6 / rapidhash) — patched in 24.x patch releases
V8 13.6 changed string hashing to `rapidhash`, which **re-introduced
HashDoS** (CVE — July 2025 security release). Ensure you are on **≥ 24.15.0**
which contains the fix. Never run v24.0.0–v24.2.x in production.

---

## 6. Permission Model

### 6.1 Enable the Permission Model for untrusted code execution
```bash
# Minimal — read-only from project directory, no child processes
node --permission \
     --allow-fs-read="$(pwd)" \
     --allow-fs-write=/tmp \
     index.js
```

### 6.2 Available permission scopes
| Flag | Scope |
|------|-------|
| `--allow-fs-read[=path]` | `fs.read` — filesystem reads |
| `--allow-fs-write[=path]` | `fs.write` — filesystem writes |
| `--allow-child-process` | `child` — `spawn`, `exec`, `fork` |
| `--allow-worker` | `worker` — `Worker` threads |
| `--allow-net[=host:port]` | `net` — network connections |
| `--allow-wasi` | `wasi` — WASI interface |
| `--allow-addons` | `addons` — native addons |

### 6.3 Verify permissions at runtime
```js
if (!process.permission.has('fs.read', '/etc/secrets')) {
  throw new Error('Required read permission not granted');
}
```

> ⚠️ **Security advisory (Dec 2025):** Crafted relative symlink paths can
> bypass `--allow-fs-read` / `--allow-fs-write` on **v24 < 24.15.0**.
> Upgrade to 24.15.0+. Avoid granting broad glob permissions; prefer
> explicit directory paths.

### 6.4 Worker threads require `--allow-worker` explicitly
```js
// This throws ERR_ACCESS_DENIED without --allow-worker
import { Worker } from 'node:worker_threads';
new Worker('./task.js'); // ❌ if --permission is set without --allow-worker
```

---

## 7. New Global APIs

### 7.1 `URLPattern` — globally available (no import needed)
```js
// ✅ No import required in v24
const pattern = new URLPattern('/api/:version/users/:id', 'https://example.com');
const match = pattern.exec('https://example.com/api/v2/users/42');
console.log(match.pathname.groups); // { version: 'v2', id: '42' }
```

### 7.2 `RegExp.escape()` — stable in v24
```js
// ✅ Safe dynamic regex construction
const userInput = 'hello.world+test';
const safePattern = new RegExp(RegExp.escape(userInput));
console.log(safePattern.test('hello.world+test')); // true
console.log(safePattern.test('helloXworldYtest')); // false
```

### 7.3 `WebSocket` — globally available client
See Section 3.2.

---

## 8. File System

### 8.1 `fs.constants` — required for access mode constants (DEP0176)
```js
// ❌ Deprecated — direct getters on fs (runtime deprecation)
fs.access('/path', fs.F_OK, cb);

// ✅ Correct
import { access, constants } from 'node:fs';
access('/path', constants.F_OK, cb);
// Or with promises:
import { access, constants } from 'node:fs/promises';
await access('/path', constants.R_OK | constants.W_OK);
```

Run the codemod:
```bash
npx codemod run @nodejs/fs-access-mode-constants
```

### 8.2 `dirent.parentPath` replaces `dirent.path` (DEP0178)
```js
// ❌ Deprecated
for (const dirent of await readdir('/some/path', { withFileTypes: true })) {
  console.log(dirent.path); // deprecated
}

// ✅ Correct
for (const dirent of await readdir('/some/path', { withFileTypes: true })) {
  console.log(dirent.parentPath); // v21.4.0+
}
```

Run the codemod:
```bash
npx codemod run @nodejs/dirent-path-to-parent-path
```

### 8.3 `fs.truncate` with file descriptor deprecated (DEP0081)
```js
// ❌ Deprecated — truncate with fd
fs.truncate(fd, 10, cb);

// ✅ Use ftruncate for file descriptors
fs.ftruncate(fd, 10, cb);
```

### 8.4 Windows path traversal — avoid reserved device names in paths
Windows device names (`CON`, `PRN`, `AUX`, `NUL`, `COM*`, `LPT*`) bypass
`path.normalize()` sanitization (CVE-2025-27210, patched in v24.15.0+).
Never use untrusted input directly in `path.join` / `fs.open` on Windows
without an allowlist check.

```js
// ✅ Validate before use
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;
if (RESERVED.test(path.basename(userInput))) {
  throw new Error('Invalid path component');
}
```

---

## 9. Streams

### 9.1 Use `for await...of` to consume Readable streams
```js
import { createReadStream } from 'node:fs';

const stream = createReadStream('./large-file.csv', { encoding: 'utf8' });
for await (const chunk of stream) {
  process(chunk);
}
```

### 9.2 Pipe errors now throw (v24 behavioral change)
In v24, errors propagated through `stream.pipe()` chains now throw if no
`error` listener is registered. Always attach error handlers:

```js
const result = readableStream
  .pipe(transformStream)
  .pipe(writableStream);

// ✅ Attach error handler to each stage
[readableStream, transformStream, writableStream].forEach((s) =>
  s.on('error', (err) => {
    console.error('Stream error:', err);
    result.destroy(err);
  })
);

// ✅ Or use stream.pipeline() which handles cleanup automatically
import { pipeline } from 'node:stream/promises';
await pipeline(readableStream, transformStream, writableStream);
```

### 9.3 `ReadableStream.from()` for Web Streams ↔ Node Streams interop
```js
import { ReadableStream } from 'node:stream/web';

// Web → Node
const nodeReadable = Readable.fromWeb(webStream);

// Node → Web
const webReadable = Readable.toWeb(nodeReadable);
```

---

## 10. Native Test Runner (`node:test`)

### 10.1 The native test runner is stable — prefer it over external frameworks
```bash
# Run all *.test.js / *.spec.js files
node --test

# Glob specific patterns
node --test "src/**/*.test.mjs"

# Watch mode
node --test --watch
```

### 10.2 Subtests are now auto-awaited (BREAKING change from v22)
In v24, `t.test()` no longer returns a `Promise` — subtests are tracked and
awaited automatically.

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ❌ v22 pattern — awaiting t.test() result
test('outer', async (t) => {
  await t.test('inner', async () => { /* ... */ }); // ← Promise removed in v24
});

// ✅ v24 pattern — no await needed
describe('user service', () => {
  it('creates a user', async () => {
    const user = await createUser({ name: 'Alice' });
    assert.strictEqual(user.name, 'Alice');
  });

  it('rejects duplicate emails', async () => {
    await assert.rejects(
      createUser({ name: 'Bob', email: 'existing@example.com' }),
      { code: 'E_DUPLICATE_EMAIL' }
    );
  });
});
```

### 10.3 Coverage with `--experimental-test-coverage`
```bash
node --test --experimental-test-coverage --test-reporter=lcov \
  --test-reporter-destination=coverage.lcov
```

### 10.4 Mocking built-ins
```js
import { mock, test } from 'node:test';
import assert from 'node:assert';

test('mocks Date.now', () => {
  const dateMock = mock.method(Date, 'now', () => 1_700_000_000_000);
  assert.strictEqual(Date.now(), 1_700_000_000_000);
  dateMock.mock.restore();
});
```

---

## 11. Worker Threads

### 11.1 Prefer `worker_threads` over `child_process` for CPU-bound work
```js
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

if (isMainThread) {
  const worker = new Worker(import.meta.filename, {
    workerData: { input: largeArray },
  });
  worker.on('message', (result) => console.log('Result:', result));
  worker.on('error', (err) => console.error('Worker error:', err));
  worker.on('exit', (code) => {
    if (code !== 0) console.error(`Worker exited with code ${code}`);
  });
} else {
  const result = heavyCompute(workerData.input);
  parentPort.postMessage(result);
}
```

### 11.2 Transfer `ArrayBuffer` to avoid copying
```js
const sharedBuffer = new SharedArrayBuffer(1024);
const uint8 = new Uint8Array(sharedBuffer);

worker.postMessage({ buffer: sharedBuffer }); // zero-copy shared memory
```

---

## 12. Diagnostics and Observability

### 12.1 Use `diagnostics_channel` for instrumentation hooks
```js
import dc from 'node:diagnostics_channel';

const requestChannel = dc.channel('my-app:request');

// Publisher
requestChannel.publish({ url: req.url, method: req.method });

// Subscriber (APM / logging layer)
dc.subscribe('my-app:request', ({ url, method }) => {
  metrics.increment('http.requests', { url, method });
});
```

### 12.2 Structured logging over `console.log`
Avoid `console.log` in production. Use structured JSON logging:

```js
function log(level, msg, meta = {}) {
  process.stdout.write(
    JSON.stringify({ ts: new Date().toISOString(), level, msg, ...meta }) + '\n'
  );
}
```

---

## 13. npm v11 — Package Management

### 13.1 Update lockfiles after upgrading
npm v11 uses a rewritten dependency resolution algorithm. Regenerate
`package-lock.json` after the upgrade to take advantage of improved resolution:

```bash
rm package-lock.json
npm install
```

### 13.2 Workspace-aware installs
```bash
npm install --workspaces          # installs all workspaces
npm run build --workspace=pkg-a   # scoped to one package
```

### 13.3 Audit runs automatically — act on high/critical findings
```bash
npm audit
npm audit fix           # auto-fix patch-compatible vulnerabilities
npm audit fix --force   # semver-major upgrades (review breaking changes first)
```

---

## 14. Breaking Changes Quick Reference (v22 → v24)

| Area | Change | Action |
|------|---------|--------|
| Platform | No pre-built 32-bit Windows (x86) or 32-bit Linux armv7 | Update CI images |
| Platform | macOS pre-built binaries require ≥ macOS 13.5 | Update runner versions |
| OpenSSL | Default security level 2; short keys / RC4 rejected | Rotate keys, remove weak ciphers |
| `fetch()` | Stricter CORS enforcement | Test cross-origin requests |
| `fs` | `F_OK`, `R_OK`, `W_OK`, `X_OK` deprecated on `fs.*` | Use `fs.constants.*` |
| `fs` | `dirent.path` deprecated | Use `dirent.parentPath` |
| `fs` | `truncate(fd)` deprecated | Use `ftruncate(fd)` |
| `crypto` | `rsa-pss` `hash`/`mgf1Hash` deprecated | Use `hashAlgorithm`/`mgf1HashAlgorithm` |
| `test` | `t.test()` no longer returns awaitable Promise | Remove `await` on subtests |
| `stream` | Pipe errors throw without listener | Always add `.on('error')` or use `pipeline()` |
| Native addons | V8 13.6 CppHeap changes; C++20 may be required | Rebuild addons; prefer NODE-API |
| Build (source) | gcc ≥ 12.2 (Linux/AIX), Xcode ≥ 16.1 (macOS) | Update toolchain |
| Build (Windows) | MSVC replaced by ClangCL | Install "C++ Clang tools for Windows" |

---

## 15. Known Issues and Mitigations

### 15.1 Unrecoverable stack exhaustion with `async_hooks.createHook()` (Jan 2026 security)
**Root cause:** Deep recursion while a `createHook` hook is active results in
an unrecoverable process crash; `uncaughtException` is never reached.
**Affected:** v20, v22, v24 (all lines).
**Mitigation:** Prefer `AsyncLocalStorage` (unaffected). Validate and bound
recursion depth on untrusted input paths. Update to latest patch releases.

### 15.2 HashDoS via V8 rapidhash (July 2025 CVE, v24.0.0–24.2.x)
**Root cause:** V8 13.6 changed string hashing to `rapidhash`; collisions are
predictable without knowing the hash seed.
**Affected:** v24.0.0–v24.2.x only.
**Mitigation:** **Upgrade to ≥ 24.3.0** (contains fix). Already on 24.15.0 — no action required.

### 15.3 Permission model symlink bypass (Dec 2025 CVE, < 24.15.0)
**Root cause:** Crafted relative symlink chains escape `--allow-fs-read/write` boundaries.
**Affected:** v20, v22, v24 < 24.15.0.
**Mitigation:** **Upgrade to 24.15.0**. Use absolute, explicit paths in permission flags rather than globs.

### 15.4 HTTP/2 HPACK crash (Dec 2025)
**Root cause:** Malformed HEADERS frame with oversized HPACK data triggers
unhandled `ECONNRESET` → process crash.
**Affected:** v20, v22, v24 < 24.15.0.
**Mitigation:** **Upgrade to 24.15.0**. Place an HTTP/2-aware reverse proxy (nginx, Envoy) in front of Node.js in production.

### 15.5 Native SQLite addon performance regression (V8 13.6)
**Root cause:** V8-owned CppHeap changes GC interaction with native modules.
`better-sqlite3` SELECT operations may be **~57% slower** than v20.
**Affected:** Any native addon using intensive C++ ↔ JS data transfer.
**Mitigation:** Benchmark before migrating. For new projects, prefer `node:sqlite`.
Watch [nodejs/node#60719](https://github.com/nodejs/node/issues/60719) for resolution.

### 15.6 Windows path traversal — `path.normalize()` device names (CVE-2025-27210)
**Root cause:** `CON`, `PRN`, `AUX`, etc. bypass normalization on Windows.
**Affected:** Windows only, < 24.15.0.
**Mitigation:** Upgrade to 24.15.0. Validate path components against a reserved-name allowlist before I/O.

---

## 16. Security Best Practices

```js
// 1. Freeze prototype chain in critical paths
Object.freeze(Object.prototype);

// 2. Validate all environment variables at startup
const PORT = Number(process.env.PORT);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be a valid integer between 1–65535');
}

// 3. Set secure TLS options
import tls from 'node:tls';
const tlsOptions = {
  minVersion: 'TLSv1.2',         // never SSLv3/TLSv1.0/TLSv1.1
  ciphers: tls.DEFAULT_CIPHERS,  // respects OpenSSL 3.5 security level 2
};

// 4. Use crypto.timingSafeEqual for HMAC / token comparisons
import { timingSafeEqual, createHmac } from 'node:crypto';
function verifyToken(provided, expected) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// 5. Run with --permission in production containerized workloads
// CMD ["node", "--permission", "--allow-fs-read=/app", "--allow-net", "dist/index.js"]
```

---

## 17. Performance Guidelines

- **V8 13.6 delivers 15–20% throughput gains** for compute-heavy, pure-JS workloads — no code changes required.
- **Prefer `node:sqlite`** over `better-sqlite3` for new projects on v24 until the CppHeap native addon regression is resolved.
- **Connection pooling:** Use `undici.Pool` or an HTTP agent when making many requests to the same host.
- **Worker threads for CPU-bound tasks:** Never block the event loop with synchronous crypto, compression, or image processing operations.
- **Streams over buffering:** Pipe data through Transform streams rather than accumulating entire payloads in memory.
- **`--max-old-space-size`:** Tune heap ceiling explicitly in containers; default is 25% of available RAM (unchanged from v22).

---

## 18. Dockerfile Reference

```dockerfile
# ✅ Pin to exact LTS patch for reproducible builds
FROM node:24.15.0-alpine

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=appuser:appgroup . .
USER appuser

# Run with Permission Model — restrict to app directory only
CMD ["node", \
     "--permission", \
     "--allow-fs-read=/app", \
     "--allow-fs-write=/tmp", \
     "--allow-net", \
     "dist/index.js"]
```

---

## 19. Production Checklist

### Version & Environment
- [ ] `node --version` returns `v24.15.0` (minimum; use latest patch)
- [ ] `.nvmrc` / `.node-version` pinned to `24.15.0`
- [ ] `package.json` `engines.node` set to `>=24.15.0`
- [ ] Dockerfile `FROM node:24.15.0-alpine` (or `-slim`)

### Security
- [ ] All TLS certificates use RSA ≥ 2048 bit keys (OpenSSL 3.5 requirement)
- [ ] RC4 and SSLv3/TLSv1.0/1.1 disabled in TLS config
- [ ] `--permission` model enabled in production with minimum-required scopes
- [ ] `npm audit` clean or all findings accepted/documented
- [ ] Path inputs involving user data validated against reserved Windows names
- [ ] Recursion depth bounded in any async context using `async_hooks.createHook()`
- [ ] Running ≥ v24.15.0 (HashDoS, symlink bypass, HTTP/2 crash — all patched)

### Code Migration
- [ ] `npx codemod run @nodejs/crypto-rsa-pss-update` executed
- [ ] `npx codemod run @nodejs/fs-access-mode-constants` executed
- [ ] `npx codemod run @nodejs/dirent-path-to-parent-path` executed
- [ ] All `require('fs')` → `require('node:fs')` (and all other built-ins)
- [ ] `dirent.path` → `dirent.parentPath` verified
- [ ] `fs.truncate(fd)` → `fs.ftruncate(fd)` verified
- [ ] `await t.test(...)` patterns removed from test files
- [ ] `stream.pipe()` chains have `.on('error')` or replaced with `pipeline()`

### Performance
- [ ] `better-sqlite3` benchmarked on v24 if used in a high-throughput path
- [ ] Worker threads in use for CPU-bound tasks (crypto, compression, image ops)
- [ ] Connection pooling configured for external HTTP calls
- [ ] Heap size (`--max-old-space-size`) set explicitly in container spec

### Observability
- [ ] Structured JSON logs (not `console.log`)
- [ ] `diagnostics_channel` or APM SDK integrated
- [ ] Graceful shutdown (`SIGTERM` → drain connections → `process.exit(0)`)
- [ ] Unhandled rejection handler:
  ```js
  process.on('unhandledRejection', (reason) => {
    log('fatal', 'Unhandled rejection', { reason });
    process.exit(1);
  });
  ```

---

*Sources: [nodejs.org/docs/latest-v24.x/api](https://nodejs.org/docs/latest-v24.x/api/),
[nodejs.org/en/blog/migrations/v22-to-v24](https://nodejs.org/en/blog/migrations/v22-to-v24),
[nodejs.org/en/blog/vulnerability](https://nodejs.org/en/blog/vulnerability/),
[github.com/nodejs/node CHANGELOG_V24](https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V24.md).
Last validated: 2026-05-10.*
