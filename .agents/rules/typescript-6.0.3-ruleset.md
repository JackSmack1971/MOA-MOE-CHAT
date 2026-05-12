---
trigger: glob
description: >
  Comprehensive coding rules for TypeScript 6.0.x (current stable: 6.0.3).
  Covers the 9 changed defaults, all removed/deprecated compiler options,
  new language features, migration from 5.x, and the TS 7.0 preparation path.
  Applies to all TypeScript source files and tsconfig configurations.
globs:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.mts"
  - "**/*.cts"
  - "tsconfig*.json"
---

# TypeScript 6.0.x Rules

> **Version:** 6.0.3 (released March 2026)
> **Status:** Final JavaScript-based TypeScript release. TypeScript 7.0 (Go/native "Project Corsa") is in preview; 6.0 is the explicit bridge.
> **API Compatibility:** Fully compatible with TypeScript 5.9.
> **Sources:** [Official Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) · [Announcing TS 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)

---

## 1. Installation

```bash
npm install -D typescript@^6.0.3
# or
pnpm add -D typescript@^6.0.3
```

Verify:
```bash
npx tsc --version
# TypeScript 6.0.3
```

---

## 2. Critical: 9 Changed Compiler Defaults

> **⚠ IMMEDIATE BREAKAGE RISK.** TypeScript 6.0 silently changed 9 default compiler settings. Any project upgrading from 5.x without an explicit `tsconfig.json` for these options will see different behavior.

| Option                       | Old Default         | New Default     | Risk Level |
|------------------------------|---------------------|-----------------|------------|
| `strict`                     | `false`             | `true`          | 🔴 HIGH    |
| `module`                     | `commonjs`          | `esnext`        | 🔴 HIGH    |
| `target`                     | `es5`               | `es2025`        | 🔴 HIGH    |
| `moduleResolution`           | `node`              | `bundler`       | 🔴 HIGH    |
| `types`                      | auto (all @types)   | `[]` (empty)    | 🔴 HIGH    |
| `rootDir`                    | inferred from src   | tsconfig dir    | 🟡 MEDIUM  |
| `esModuleInterop`            | `false`             | `true`          | 🟡 MEDIUM  |
| `noUncheckedSideEffectImports` | `false`           | `true`          | 🟡 MEDIUM  |
| `libReplacement`             | `true`              | `false`         | 🟢 LOW     |

### 2.1 Most Common Post-Upgrade Breakages

**`types: []` — Empty Array Default**

The `types` field now defaults to an empty array `[]`, meaning no `@types/*` packages are auto-included.
Backend projects will immediately see `Cannot find name 'process'`, `Cannot find module 'fs'`, etc.

```jsonc
// ❌ BEFORE (5.x implicit behavior — all @types auto-included)
{
  "compilerOptions": {}
}

// ✅ AFTER (6.0 — explicit types required)
{
  "compilerOptions": {
    "types": ["node"]            // For Node.js backends
    // "types": ["node", "jest"] // + test runner types
    // "types": []               // Keep empty for browser-only with no global @types
  }
}
```

**`rootDir` — Now Defaults to tsconfig Directory**

Previously `rootDir` was inferred from source files. Now it defaults to the directory containing `tsconfig.json`, which can cause nested `dist/src/...` output structure.

```jsonc
// ✅ Always set rootDir and outDir explicitly
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  }
}
```

**`noUncheckedSideEffectImports: true` — Side-Effect Imports Are Checked**

Bare imports like `import "./polyfill"` now cause a type error if the module cannot be resolved.

```typescript
// ❌ Will error if polyfill.ts/js is not resolvable
import "./setup-globals";

// ✅ Ensure the file exists and is reachable from moduleResolution config
// OR temporarily suppress with:
// "noUncheckedSideEffectImports": false  (if migration is blocked)
```

**`strict: true` — All Strict Flags Enabled by Default**

If you previously relied on `strict: false`, you now need to explicitly opt out of individual flags rather than the whole group:

```jsonc
// ✅ Phase in strict mode selectively if needed
{
  "compilerOptions": {
    "strict": true,
    "strictPropertyInitialization": false,  // Phase-in if needed
    "noImplicitAny": true                   // Keep the most important ones
  }
}
```

---

## 3. Removed Options (Hard Compile Errors)

> These are **fully removed** in 6.0. Using them causes `error TS5108` or similar. `ignoreDeprecations` does not restore them.

### 3.1 `--moduleResolution classic` — REMOVED

The `classic` strategy is gone. It predates Node.js module resolution becoming standard.

```jsonc
// ❌ ERROR in 6.0
{ "moduleResolution": "classic" }

// ✅ Migrate to:
{ "moduleResolution": "nodenext" }   // For Node.js
{ "moduleResolution": "bundler" }    // For Vite/Webpack/Rollup/ESBuild
```

### 3.2 AMD / UMD / SystemJS Module Formats — REMOVED

```jsonc
// ❌ ERROR — these module formats are removed
{ "module": "amd" }
{ "module": "umd" }
{ "module": "system" }
{ "module": "none" }

// ✅ Migrate to:
{ "module": "esnext" }     // For bundled apps (most common)
{ "module": "nodenext" }   // For Node.js ESM
{ "module": "commonjs" }   // For Node.js CJS (legacy)
{ "module": "preserve" }   // For mixed environments
```

### 3.3 `--outFile` — REMOVED

```jsonc
// ❌ ERROR in 6.0
{ "outFile": "./bundle.js" }

// ✅ Use a bundler: Webpack, Rollup, Vite, ESBuild, etc.
```

### 3.4 `esModuleInterop: false` and `allowSyntheticDefaultImports: false` — NOT ALLOWED

Safer interop is always enabled. These cannot be set to `false`.

```jsonc
// ❌ ERROR in 6.0
{ "esModuleInterop": false }
{ "allowSyntheticDefaultImports": false }

// ✅ Remove these entries — esModuleInterop: true is now the enforced default
```

### 3.5 `alwaysStrict: false` — NOT ALLOWED

All emitted code is now strict mode. This cannot be disabled.

### 3.6 `/// <no-default-lib />` Triple-Slash Directive — REMOVED

```typescript
// ❌ ERROR — directive is removed
/// <reference no-default-lib="true"/>

// ✅ Use compiler options instead
// tsconfig.json: { "noLib": true }
// Or use libReplacement for custom lib substitution
```

### 3.7 Import Assertions (`assert`) — DEPRECATED (errors in `import()` calls in 6.0 final)

```typescript
// ❌ DEPRECATED — assert syntax fully deprecated, including in import() calls
import data from "./data.json" assert { type: "json" };
const mod = await import("./mod", { assert: { type: "json" } });

// ✅ Use import attributes (with) instead
import data from "./data.json" with { type: "json" };
const mod = await import("./mod", { with: { type: "json" } });
```

---

## 4. Deprecated Options (Work with `ignoreDeprecations: "6.0"`, Removed in TS 7.0)

> Use `"ignoreDeprecations": "6.0"` as a **temporary migration stopgap only**. All deprecations must be resolved before upgrading to TypeScript 7.0.

```jsonc
// ⚠ Temporary suppression only — treat as tech debt
{
  "compilerOptions": {
    "ignoreDeprecations": "6.0"
  }
}
```

| Deprecated Option              | Replacement                                      |
|-------------------------------|--------------------------------------------------|
| `target: "es5"`               | `target: "es2015"` or higher                    |
| `moduleResolution: "node"`    | `moduleResolution: "nodenext"` or `"bundler"`   |
| `moduleResolution: "node10"`  | Same as above                                    |
| `baseUrl` (as resolution root)| Remove; prefix `paths` entries explicitly        |
| `module: "none"`              | `module: "esnext"` or appropriate target        |

### 4.1 `baseUrl` Deprecation Detail

```jsonc
// ❌ DEPRECATED — baseUrl as resolution root
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "utils/*": ["utils/*"]
    }
  }
}

// ✅ Remove baseUrl, add prefix to paths entries
{
  "compilerOptions": {
    "paths": {
      "utils/*": ["./src/utils/*"]
    }
  }
}
```

---

## 5. Recommended tsconfig.json Templates

### 5.1 Modern Bundled Web App (React/Next.js/Vite)

```jsonc
{
  "compilerOptions": {
    "target": "es2025",
    "lib": ["es2025", "dom", "dom.iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedSideEffectImports": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "rootDir": "./src",
    "types": []
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 5.2 Node.js Backend (ESM)

```jsonc
{
  "compilerOptions": {
    "target": "es2025",
    "lib": ["es2025"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noUncheckedSideEffectImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 5.3 Node.js Backend (CommonJS / Legacy Compatibility)

```jsonc
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022"],
    "module": "commonjs",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

> **Note:** `--moduleResolution bundler` + `--module commonjs` is now a supported combination in TS 6.0, introduced specifically as a migration path for CJS projects moving away from deprecated `--moduleResolution node`.

---

## 6. New Features in TypeScript 6.0

### 6.1 Improved Inference: `this`-less Method Syntax Functions

**What changed:** Methods that never use `this` are no longer considered "contextually sensitive" — they now participate in type inference at higher priority, same as arrow functions.

```typescript
// ✅ NOW WORKS in 6.0 — method syntax with inferred params in any property order
declare function callIt<T>(obj: {
  produce: (x: number) => T,
  consume: (y: T) => void,
}): void;

// Both orderings work correctly now
callIt({
  consume(y) { return y.toFixed(); }, // y inferred as number ✅
  produce(x: number) { return x * 2; },
});

// If you encounter errors after upgrade due to inference changes,
// provide an explicit type argument:
callIt<number>({ /* ... */ });
```

### 6.2 Subpath Imports Starting with `#/`

```jsonc
// package.json — now supports bare #/ prefix (Node.js 20.19+)
{
  "name": "my-package",
  "type": "module",
  "imports": {
    "#/*": "./dist/*"
  }
}
```

```typescript
// ✅ Clean internal alias — no need for #root/, #src/, etc.
import { helper } from "#/utils.js";
import { config } from "#/config/index.js";
```

> Requires `moduleResolution: "nodenext"` or `"bundler"` in tsconfig.

### 6.3 `--stableTypeOrdering` Flag (Diagnostic Only)

Used exclusively to preview TypeScript 7.0's deterministic type ordering behavior. **Not for production use** — adds up to 25% slower type-checking.

```jsonc
// ⚠ USE ONLY DURING 6.0→7.0 MIGRATION DIAGNOSTICS
{
  "compilerOptions": {
    "stableTypeOrdering": true
  }
}
```

If this flag surfaces new type errors, fix them by providing explicit types:

```typescript
// ❌ Inference might have worked "by accident" in 5.x
someFunctionCall(complexArg);

// ✅ Add explicit type argument or annotation
someFunctionCall<ExplicitType>(complexArg);
const typed: ExplicitType = complexArg;
someFunctionCall(typed);
```

### 6.4 `es2025` Target and `lib`

TypeScript 6.0 defaults to `target: "es2025"`, which includes built-in API types for:
- `RegExp.escape`
- `Promise.try`
- `Iterator` methods
- `Set` methods

```jsonc
// Explicit es2025 target — built-in APIs included without extra lib config
{
  "compilerOptions": {
    "target": "es2025",
    "lib": ["es2025", "dom"]
  }
}
```

### 6.5 Temporal API Types (Built-in)

Temporal is now stage 4 ECMAScript. TypeScript 6.0 includes built-in types under `esnext.temporal`.

```typescript
// Requires target: "esnext" or lib: ["esnext"] or lib: ["esnext.temporal"]
const yesterday = Temporal.Now.instant().subtract({ hours: 24 });
const tomorrow  = Temporal.Now.instant().add({ hours: 24 });
const now = Temporal.Now.plainDateTimeISO();

// Date arithmetic without mutation:
const deadline = Temporal.PlainDate.from("2026-12-31");
const daysLeft = Temporal.Now.plainDateISO().until(deadline).days;
```

> **Browser Support (May 2026):** Firefox ✅, Chrome ✅, Safari ❌ (pending)
> For Safari support, install `@js-temporal/polyfill`.

```typescript
// Polyfill pattern for cross-browser compatibility:
import { Temporal as TemporalPolyfill } from "@js-temporal/polyfill";
const Temporal = globalThis.Temporal ?? TemporalPolyfill;
```

### 6.6 Map/WeakMap Upsert Methods (`getOrInsert`)

ECMAScript "upsert" proposal (stage 4) types added to `esnext` lib.

```typescript
// ❌ Old verbose pattern
const counts = new Map<string, number>();
if (!counts.has(key)) { counts.set(key, 0); }
const count = counts.get(key)!;

// ✅ New: getOrInsert
const count = counts.getOrInsert(key, 0);

// ✅ New: getOrInsertComputed — callback only called if key absent
const value = someMap.getOrInsertComputed("expensiveKey", (k) => {
  return computeExpensiveDefault(k);
});
```

### 6.7 `RegExp.escape`

```typescript
// Safely escape user input for use in RegExp
const userInput = "hello.world(test)";
const safe = RegExp.escape(userInput);
const re = new RegExp(safe); // ✅ No regex injection risk
```

### 6.8 DOM lib Now Includes `dom.iterable` and `dom.asynciterable`

No longer need to add these manually when using `lib: ["es2025", "dom"]`.

```jsonc
// ❌ No longer needed:
{ "lib": ["es2025", "dom", "dom.iterable", "dom.asynciterable"] }

// ✅ Simplified:
{ "lib": ["es2025", "dom"] }
```

---

## 7. Module System Best Practices

### 7.1 Resolution Mode Decision Matrix

| Environment                  | `module`       | `moduleResolution` |
|-----------------------------|----------------|--------------------|
| Vite / Webpack / Rollup app | `esnext`       | `bundler`          |
| Next.js (App Router)        | `preserve`     | `bundler`          |
| Node.js ESM (`.mts`)        | `nodenext`     | `nodenext`         |
| Node.js CJS (legacy)        | `commonjs`     | `bundler`          |
| Bun                         | `nodenext`     | `nodenext`         |
| Library (dual ESM/CJS)      | `preserve`     | `bundler`          |

### 7.2 `verbatimModuleSyntax` (Recommended)

Ensures type-only imports are erased at emit without accidentally triggering side effects.

```typescript
// ✅ Explicit type imports — required with verbatimModuleSyntax: true
import type { User } from "./types";
import { createUser } from "./user-service";

// ❌ Value import used only as type — error with verbatimModuleSyntax
import { User } from "./types"; // Used only as type
```

### 7.3 Subpath Imports Pattern

```jsonc
// package.json
{
  "imports": {
    "#/*": "./src/*",
    "#/components/*": "./src/components/*.js",
    "#/utils": "./src/utils/index.js"
  }
}
```

```typescript
// ✅ Clean internal aliasing — no relative path climbing
import { Button } from "#/components/Button";
import { formatDate } from "#/utils";
```

---

## 8. Strict Mode Patterns

With `strict: true` as the new default, ensure these patterns are followed:

```typescript
// ✅ noImplicitAny — always annotate function parameters
function process(data: unknown): string {
  return String(data);
}

// ✅ strictNullChecks — explicit null handling
function getName(user: { name: string } | null): string {
  return user?.name ?? "Anonymous";
}

// ✅ strictFunctionTypes — proper callback typing
type Handler = (event: MouseEvent) => void;
const handler: Handler = (e) => console.log(e.clientX); // e is MouseEvent ✅

// ✅ useUnknownInCatchVariables — catch with unknown, not any
try {
  riskyOperation();
} catch (err: unknown) {
  if (err instanceof Error) {
    console.error(err.message);
  }
}
```

---

## 9. Known Issues and Mitigations

### 9.1 `types: []` Causes Missing Global Errors

**Error:** `Cannot find name 'process'` / `Cannot find name 'Buffer'` / `Cannot find name 'describe'`

**Root cause:** `types` defaults to empty array; `@types/node`, `@types/jest`, etc. are not auto-included.

**Fix:**
```jsonc
{ "types": ["node", "jest"] }
```

### 9.2 Output Nested in `dist/src/...` After Upgrade

**Error:** `outDir` has unexpected nesting after upgrade.

**Root cause:** `rootDir` now defaults to the tsconfig directory rather than being inferred from sources.

**Fix:**
```jsonc
{ "rootDir": "./src", "outDir": "./dist" }
```

### 9.3 `--module commonjs` Without Explicit `moduleResolution` Changes Silently

**Symptom:** Module resolution behavior changes without any error or deprecation warning.

**Root cause:** Projects using `--module commonjs` without explicit `moduleResolution` now get `bundler` instead of `node10`. This is a silent default change.

**Fix:** Always set `moduleResolution` explicitly.

```jsonc
{ "module": "commonjs", "moduleResolution": "bundler" }
```

### 9.4 `--stableTypeOrdering` Surfaces New Type Errors

**Symptom:** Errors appear only when `stableTypeOrdering: true` is set.

**Root cause:** Previous inference worked "by accident" based on non-deterministic type ordering. TypeScript 7.0 will always use deterministic ordering.

**Fix:** Add explicit type annotations where errors appear:
```typescript
// Before
const result = inferredFn(complexObj);
// After
const result = inferredFn<ExplicitType>(complexObj);
```

### 9.5 `noUncheckedSideEffectImports` Breaks Polyfill-Only Imports

**Error:** `Module 'X' has no exported members` on bare imports used only for side effects.

**Fix Option A:** Ensure the module is resolvable and has proper type declarations.

**Fix Option B:** Suppress per-file:
```typescript
// @ts-expect-error -- side-effect import, no types available
import "some-polyfill";
```

**Fix Option C:** Disable in tsconfig (not recommended long-term):
```jsonc
{ "noUncheckedSideEffectImports": false }
```

### 9.6 Import Assertions Syntax Errors

**Error:** Syntax errors on `import X from "Y" assert { type: "json" }`.

**Fix:** Replace `assert` with `with`:
```typescript
import data from "./config.json" with { type: "json" };
```

---

## 10. Migration from TypeScript 5.x

### 10.1 Automated Migration Tool

```bash
# Run the official migration helper first
npx @andrewbranch/ts5to6

# Then install TypeScript 6.0
npm install -D typescript@^6.0.3

# Surface all remaining errors
npx tsc --noEmit
```

### 10.2 Manual Migration Checklist

```
[ ] 1. Set "types" explicitly (at minimum ["node"] for backends)
[ ] 2. Set "rootDir" and "outDir" explicitly  
[ ] 3. Replace "moduleResolution": "node" → "nodenext" or "bundler"
[ ] 4. Remove "moduleResolution": "classic" (add "nodenext"/"bundler")
[ ] 5. Remove "module": "amd"/"umd"/"system"/"none" → use "esnext"/"commonjs"/"nodenext"
[ ] 6. Replace "assert" import attributes → "with" syntax
[ ] 7. Remove "baseUrl" → prefix paths entries manually
[ ] 8. Remove "outFile" → adopt a bundler
[ ] 9. Remove "esModuleInterop": false (now enforced true)
[ ] 10. Remove "allowSyntheticDefaultImports": false
[ ] 11. Address all "strict: true" errors (or phase in selectively)
[ ] 12. Remove "/// <reference no-default-lib="true"/>" → use "noLib" option
[ ] 13. For deprecated-but-not-removed: add "ignoreDeprecations": "6.0" as stopgap
[ ] 14. Optionally run with "--stableTypeOrdering" to preview TS 7.0 behavior
```

### 10.3 Before / After Config Example

```jsonc
// ❌ BEFORE — 5.x project with implicit defaults
{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": { "utils/*": ["utils/*"] },
    "esModuleInterop": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}

// ✅ AFTER — 6.0 compliant
{
  "compilerOptions": {
    "target": "es2022",                  // es5 deprecated → upgrade target
    "module": "commonjs",
    "moduleResolution": "bundler",       // node → bundler
    "paths": { "utils/*": ["./src/utils/*"] }, // baseUrl removed; paths prefixed
    "esModuleInterop": true,
    "strict": true,
    "types": ["node"],                   // explicit types
    "rootDir": "./src",                  // explicit rootDir
    "outDir": "./dist",
    "noUncheckedSideEffectImports": true
  },
  "include": ["src/**/*"]
}
```

---

## 11. TypeScript 7.0 Preparation

> **Context:** TypeScript 7.0 ("Project Corsa") is a native Go rewrite. VS Code's 1.5M-line codebase went from 77s type-check → 7.5s. It's in preview now; treat TS 6.0 as the mandatory stepping stone.

### 11.1 Key Differences to Expect

- **Type ordering** in `.d.ts` emit will change (deterministic algorithm). Use `--stableTypeOrdering` to preview.
- **Parallel type checking** may surface previously hidden errors.
- All `ignoreDeprecations: "6.0"` suppressions must be resolved.

### 11.2 Try TS 7.0 Native Preview

```bash
# VS Code extension
# Search: "TypeScript Native Preview" by TypeScriptTeam

# npm native preview
npm install -D @typescript/native-preview

# In tsconfig.json for native tsc:
# No changes needed — 7.0 is API compatible with 6.0
```

---

## 12. Anti-Patterns

```typescript
// ❌ Using `any` — defeats the type system
function process(data: any) { return data.value; }
// ✅ Use `unknown` with type guards
function process(data: unknown) {
  if (typeof data === "object" && data !== null && "value" in data) {
    return (data as { value: unknown }).value;
  }
}

// ❌ Non-null assertion without justification
const el = document.getElementById("root")!;
// ✅ Explicit null guard
const el = document.getElementById("root");
if (!el) throw new Error("Root element not found");

// ❌ `import X from "X" assert { type: "json" }` — deprecated
import config from "./config.json" assert { type: "json" };
// ✅ Use `with`
import config from "./config.json" with { type: "json" };

// ❌ Implicit any in catch
try { } catch (e) { console.log(e.message); } // e is unknown in strict mode
// ✅
try { } catch (e: unknown) {
  if (e instanceof Error) console.log(e.message);
}

// ❌ Relying on auto-included @types (breaks with types: [])
// (No explicit types in tsconfig — process, Buffer, etc. will be undefined)
// ✅ Always set types explicitly in tsconfig
```

---

## 13. Production Checklist

```
Compilation
[ ] `tsc --noEmit` passes with zero errors
[ ] No `ignoreDeprecations: "6.0"` in final production tsconfig
[ ] `strict: true` enabled (or all individual strict flags set)
[ ] `verbatimModuleSyntax: true` enabled
[ ] `declaration: true` + `declarationMap: true` for libraries

Configuration
[ ] `types` array is explicit and minimal
[ ] `rootDir` and `outDir` are both explicitly set
[ ] `moduleResolution` is explicit (`bundler` or `nodenext`)
[ ] No deprecated options (node/classic resolution, baseUrl, outFile, etc.)
[ ] No removed options (amd/umd/system module, esModuleInterop: false)

Modern APIs
[ ] Import assertions use `with` syntax (not `assert`)
[ ] Subpath imports use `#/` prefix if using Node.js 20.19+ with nodenext/bundler
[ ] Temporal polyfill installed if Safari support required
[ ] `types` includes test runner types in test tsconfig (e.g., `["node", "jest"]`)

TS 7.0 Readiness
[ ] All ignoreDeprecations suppressions are tracked and scheduled for removal
[ ] Optionally validated with --stableTypeOrdering flag in CI
[ ] Target and lib options >= es2022 (es5 target deprecated)
```

---

*Last updated: May 2026 · TypeScript 6.0.3 · Sources: typescriptlang.org, devblogs.microsoft.com/typescript*
