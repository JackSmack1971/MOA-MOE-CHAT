---
trigger: model_decision
description: >
  Authoritative coding ruleset for Svelte v5.55.5 — runes-based reactivity,
  snippets, event-handler syntax, shared-state patterns, imperative API, and
  full migration map from Svelte 4. Applies to .svelte, .svelte.js, .svelte.ts,
  and SvelteKit +page.svelte / +layout.svelte files.
globs:
  - "**/*.svelte"
  - "**/*.svelte.js"
  - "**/*.svelte.ts"
version: "5.55.5"
last_updated: "2026-05-12"
sources:
  - https://svelte.dev/docs/svelte/v5-migration-guide
  - https://svelte.dev/docs/svelte/$effect
  - https://svelte.dev/docs/svelte/runtime-errors
  - https://svelte.dev/docs/svelte/legacy-component-api
---

# Svelte v5.55.5 Rules

## Executive Summary

Svelte 5 replaces all Svelte 4 implicit reactivity with **runes** — explicit
compiler directives prefixed with `$`. The change is architectural:

| Svelte 4 Pattern | Svelte 5 Replacement |
|---|---|
| `let count = 0` (implicit reactive) | `let count = $state(0)` |
| `$: doubled = count * 2` | `const doubled = $derived(count * 2)` |
| `$: { sideEffect() }` | `$effect(() => { sideEffect() })` |
| `export let name` | `let { name } = $props()` |
| `<slot />` / named slots | `{@render children()}` / snippets |
| `on:click={handler}` | `onclick={handler}` |
| `createEventDispatcher` | callback props |
| `new Component({ target })` | `mount(Component, { target })` |
| `writable()` / `readable()` | `$state` in `.svelte.js` files |
| `$$props` / `$$restProps` | destructured `$props()` with rest |

Runes mode activates automatically the moment any rune appears in a file. No
opt-in flag or config is needed. Svelte 4 and Svelte 5 syntax can coexist in
the same project (file-by-file migration).

---

## 1. Runes — Core API

### 1.1 `$state` — Reactive State

```svelte
<script lang="ts">
  // ✅ Primitive state
  let count = $state(0)

  // ✅ Object state — deep reactive proxy
  let user = $state({ name: 'Bret', score: 0 })

  // ✅ Array state — mutations tracked
  let items = $state<string[]>([])

  // ✅ Mutation triggers reactivity
  function add(item: string) {
    items.push(item)          // .push(), .splice(), etc. all tracked
    user.score += 1           // property mutation tracked
  }

  // ✅ Reassignment also triggers reactivity
  function reset() {
    count = 0
    items = []
  }
</script>
```

**Rules:**
- ALWAYS declare reactive variables with `$state()` — bare `let` is NOT
  reactive in runes mode.
- Deep objects/arrays become Proxy objects; mutations (`.push()`, property
  assignment) are tracked automatically.
- For large, rarely-mutated objects (parsed API responses, config blobs), use
  `$state.raw()` to skip deep proxying and avoid unnecessary overhead.

```svelte
<script lang="ts">
  // ✅ $state.raw — no deep proxy, manually trigger reactivity by reassignment
  let config = $state.raw({ theme: 'dark', locale: 'en' })

  function updateTheme(theme: string) {
    // MUST reassign — mutation is NOT tracked with $state.raw
    config = { ...config, theme }
  }
</script>
```

### 1.2 `$derived` — Computed Values

```svelte
<script lang="ts">
  let width = $state(10)
  let height = $state(5)

  // ✅ Simple expression
  const area = $derived(width * height)

  // ✅ Complex derived with $derived.by (multi-line logic)
  const summary = $derived.by(() => {
    const perimeter = 2 * (width + height)
    return `${width}×${height}, area=${area}, perimeter=${perimeter}`
  })
</script>
```

**Rules:**
- Use `$derived` (not `$effect`) for any value that is computed from state.
  `$derived` is always consistent with its dependencies; `$effect` is not.
- `$derived.by(() => { ... })` is the multi-statement form — use it when the
  derivation requires intermediate variables or branching logic.
- NEVER mutate state inside `$derived` — it is read-only by contract.
- `$derived` values are lazy and memoized; they only recompute when their
  reactive dependencies change.

### 1.3 `$effect` — Side Effects

```svelte
<script lang="ts">
  import { untrack } from 'svelte'

  let query = $state('')
  let results = $state<string[]>([])

  // ✅ Side effect — fetches when query changes
  $effect(() => {
    if (!query) return
    fetch(`/api/search?q=${query}`)
      .then(r => r.json())
      .then(data => {
        // ✅ Writes to results; results is NOT read inside this effect,
        //    so no infinite loop
        results = data
      })
    // ✅ Cleanup — called before next run or on unmount
    return () => {
      // abort controller cleanup here
    }
  })

  // ✅ $effect.pre — runs BEFORE DOM update (e.g., scroll position reads)
  let container: HTMLElement
  $effect.pre(() => {
    const isAtBottom =
      container.scrollHeight - container.scrollTop === container.clientHeight
    // store for post-update use
  })
</script>
```

**Rules:**
- Use `$effect` ONLY for side effects (DOM APIs, fetch calls, external
  subscriptions, logging). For derived values, use `$derived`.
- `$effect` does NOT run during SSR — safe for browser-only APIs.
- Return a cleanup function to cancel subscriptions, timers, or abort
  controllers. Cleanup runs before the next effect execution AND on unmount.
- Effect dependencies are determined at RUNTIME (last read), not statically —
  conditional reads can cause dependencies to appear/disappear between runs.
- `$effect.pre` runs synchronously before DOM updates; use it to read DOM
  measurements that must be captured before the DOM changes.

### 1.4 `$props` — Component Props

```svelte
<!-- Child.svelte -->
<script lang="ts">
  interface Props {
    name: string
    count?: number
    class?: string
    // ✅ Capture remaining HTML attributes with rest
    [key: string]: unknown
  }

  // ✅ Destructure with defaults
  let { name, count = 0, class: className = '', ...rest }: Props = $props()
</script>

<div class={className} {...rest}>
  {name} — {count}
</div>
```

**Rules:**
- ALWAYS use `$props()` instead of `export let` in runes mode.
- Rename reserved words with destructuring aliases: `class` → `class: className`.
- Use rest spread (`...rest`) to forward unknown HTML attributes to the root
  element — replaces `$$restProps`.
- Props are read-only by default; mutating a prop directly throws a runtime
  warning. Use `$bindable()` for two-way binding.
- `$props.id()` returns a stable SSR-safe unique ID for ARIA label linkage.

```svelte
<script lang="ts">
  const uid = $props.id()
</script>
<label for="{uid}-email">Email</label>
<input id="{uid}-email" type="email" />
```

### 1.5 `$bindable` — Two-Way Bound Props

```svelte
<!-- Input.svelte -->
<script lang="ts">
  // ✅ Declare prop as bindable with optional default
  let { value = $bindable('') }: { value?: string } = $props()
</script>
<input bind:value={value} />

<!-- Parent.svelte -->
<script lang="ts">
  import Input from './Input.svelte'
  let text = $state('')
</script>
<Input bind:value={text} />
<p>{text}</p>
```

**Rules:**
- `$bindable()` is required on the child prop for `bind:propName` on the parent
  to work — omitting it causes a compile-time error.
- If a bindable prop has a default value and the parent binds to it, the parent
  MUST pass a defined (non-undefined) value. The Svelte 4 pattern of reflecting
  defaults back to the parent is gone.
- Use `$bindable` sparingly — prefer callback props (e.g., `onchange`) for
  unidirectional data flow in most cases.

### 1.6 `$inspect` — Reactive Debugging

```svelte
<script lang="ts">
  let count = $state(0)

  // ✅ Logs whenever count changes (dev builds only)
  $inspect(count)

  // ✅ Custom handler
  $inspect(count).with((type, value) => {
    console.table({ type, value })
  })

  // ✅ Trace which signals caused an effect to re-run
  const doubled = $derived.by(() => {
    $inspect.trace('doubled')
    return count * 2
  })
</script>
```

**Rules:**
- `$inspect` is a no-op in production builds — safe to leave in code.
- `$inspect.trace()` prints all reactive reads inside a `$derived.by` or
  `$effect` scope, with the triggering signal highlighted. Use it to debug
  unexpected re-runs.

### 1.7 `$host` — Custom Element Access

```svelte
<!-- Only valid inside <svelte:options customElement="..."> components -->
<script lang="ts">
  const host = $host()  // returns the custom element host node
</script>
```

**Rule:** `$host` is only valid inside components compiled as custom elements.
Do not use it in standard Svelte components.

---

## 2. Component Architecture

### 2.1 Snippets (Replacing Slots)

```svelte
<!-- Card.svelte — Consumer -->
<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    header?: Snippet
    children: Snippet          // required default slot equivalent
    footer?: Snippet<[number]> // parametric snippet receives args
  }

  let { header, children, footer }: Props = $props()
</script>

<div class="card">
  {#if header}
    <div class="card-header">{@render header()}</div>
  {/if}
  <div class="card-body">{@render children()}</div>
  {#if footer}
    <div class="card-footer">{@render footer(42)}</div>
  {/if}
</div>
```

```svelte
<!-- Usage in parent -->
<Card>
  {#snippet header()}
    <h2>Title</h2>
  {/snippet}

  <p>Default children content</p>

  {#snippet footer(count)}
    <small>{count} items</small>
  {/snippet}
</Card>
```

**Rules:**
- `<slot />` and named slots are **deprecated** in Svelte 5. Use `{#snippet}`
  + `{@render}` instead.
- Type snippet props with `Snippet` (no args) or `Snippet<[ArgType, ...]>`
  (parametric) from `'svelte'`.
- Content inside component tags becomes the implicit `children` snippet. You
  CANNOT have a prop named `children` if you also pass tag content.
- Snippets defined inside a component's template can be passed as props to
  child components.

### 2.2 Event Handling

```svelte
<script lang="ts">
  // ✅ Standard HTML attribute syntax (Svelte 5)
  function handleClick(event: MouseEvent) {
    console.log(event.target)
  }

  // ✅ Inline handlers
</script>

<!-- ✅ Svelte 5 -->
<button onclick={handleClick}>Click</button>
<input oninput={(e) => (value = e.currentTarget.value)} />
<form onsubmit={(e) => { e.preventDefault(); submit() }}>...</form>

<!-- ❌ Svelte 4 (deprecated, produces warnings) -->
<button on:click={handleClick}>Click</button>
```

**Rules:**
- Use standard HTML event attribute names: `onclick`, `oninput`, `onsubmit`,
  `onkeydown`, etc. The `on:eventname` directive is deprecated.
- Multiple handlers: assign an array or compose in a wrapper function — there is
  no built-in multi-handler syntax.
- Event modifiers (`|preventDefault`, `|stopPropagation`) are removed. Call
  `e.preventDefault()` inside the handler body.
- `createEventDispatcher` is **removed** in runes mode. Replace with callback
  props typed as functions.

```svelte
<!-- ✅ Callback props replace createEventDispatcher -->
<script lang="ts">
  let { onselect }: { onselect?: (value: string) => void } = $props()
</script>
<button onclick={() => onselect?.('selected')}>Select</button>
```

### 2.3 Lifecycle

```svelte
<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'

  // ✅ onMount — runs once after DOM render, browser-only
  onMount(() => {
    const id = setInterval(() => count++, 1000)
    return () => clearInterval(id)  // cleanup on destroy
  })

  // ✅ tick — waits for pending DOM updates
  async function handleInput() {
    value = 'new'
    await tick()
    // DOM is now updated
  }

  // ✅ $effect replaces most onMount use cases for reactive behavior
  $effect(() => {
    // runs after mount AND whenever reactive deps change
    document.title = `Count: ${count}`
  })
</script>
```

**Rules:**
- `onMount` and `onDestroy` remain valid and are the recommended approach for
  one-time initialization and cleanup unrelated to reactive state.
- Prefer `$effect` when behavior should re-run on state changes (not just once).
- `tick()` is still necessary when you need to wait for DOM updates before
  reading DOM measurements.

---

## 3. Shared / Cross-Component State

```ts
// stores/counter.svelte.ts  ← .svelte.ts extension enables runes outside components
export const counter = $state({ count: 0 })

// ✅ Export a getter/setter object, NOT the reassignable let directly
export function increment() {
  counter.count++
}
```

```svelte
<!-- ComponentA.svelte -->
<script lang="ts">
  import { counter, increment } from '$lib/stores/counter.svelte'
</script>
<button onclick={increment}>{counter.count}</button>
```

**Rules:**
- To share reactive state, use `$state` inside `.svelte.js` or `.svelte.ts`
  files — these enable runes outside of `.svelte` components.
- CANNOT directly `export let x = $state(0)` and then reassign `x` from outside
  the module — export a mutable object and mutate its properties instead.
- This pattern replaces Svelte stores (`writable`, `readable`, `derived`).
  Stores still work in v5 for backward compatibility but are not recommended
  for new code.

---

## 4. Imperative Component API

```ts
// ✅ Svelte 5 — mount / hydrate / unmount
import { mount, hydrate, unmount } from 'svelte'
import App from './App.svelte'

// Mount to DOM
const app = mount(App, {
  target: document.getElementById('app')!,
  props: { name: 'world' }
})

// Hydrate server-rendered HTML
const app2 = hydrate(App, {
  target: document.getElementById('server-rendered')!,
  props: { name: 'world' }
})

// Destroy
unmount(app)

// ❌ Svelte 4 legacy (removed in runes mode)
// const app = new App({ target, props })
// app.$destroy()
```

**Rules:**
- Use `mount()` for client-side mounting and `hydrate()` for hydrating
  SSR-rendered HTML. `unmount()` replaces `$destroy()`.
- `mount()` returns component exports (if any). Props are passed as the `props`
  key of the options object.
- The legacy `new Component(options)` constructor is removed in runes mode.
  Use the `svelte/legacy` `createClassComponent` adapter only during incremental
  migration, not for new code.
- The `hydratable` compiler option is removed — all components are now
  hydratable by default.

---

## 5. TypeScript Patterns

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte'

  // ✅ Type props inline
  interface Props {
    title: string
    items: string[]
    onselect?: (item: string) => void
    children?: Snippet
  }

  let { title, items, onselect, children }: Props = $props()

  // ✅ Type $state explicitly for complex types
  let selected = $state<string | null>(null)

  // ✅ Type $derived
  const filtered = $derived(
    items.filter(i => i.toLowerCase().includes(title.toLowerCase()))
  )
</script>
```

**Rules:**
- Always add `lang="ts"` to `<script>` for TypeScript support.
- Import `Snippet` from `'svelte'` (not `'svelte/types'`).
- Explicit type annotations on `$state<T>()` are required when the initial
  value does not carry enough type information (e.g., `$state<User | null>(null)`).
- `Component` type from `'svelte'` is the generic component type for dynamic
  rendering.

---

## 6. Known Issues and Mitigations

| Issue | Trigger | Root Cause | Mitigation |
|---|---|---|---|
| `effect_update_depth_exceeded` | Writing to `$state` inside `$effect` that also reads the same state | Effect reads state → re-runs → writes state → re-runs (cycle) | Use `$derived` instead; or wrap the write in `untrack()` with a conditional guard |
| Infinite loop with array `$state` + `$effect` | Assigning `[]` or a new object reference inside an effect that reads the array | New array/object reference triggers proxy read → marks as dependency → reassignment triggers re-run | Move the assignment outside the effect; use `$state.raw` if deep tracking not needed |
| `.push()` inside `$effect` causes infinite loop | `arr.push(item)` reads `arr` (returns new length) AND mutates it | Both read and write to the same reactive signal | Use `untrack(() => arr).push(item)` or restructure so the push is triggered by a callback, not an effect |
| Cross-effect circular dependency | Effect A mutates state B; Effect B mutates state A | Circular reactive graph | Consolidate into a single effect with conditional mutation, or use `$derived` to express the relationship |
| Legacy `on:event` warnings | Using `on:click` etc. in runes-mode components | Directive is deprecated | Migrate to `onclick` attribute syntax |
| `export const` binding error | `<A bind:foo />` where `foo` is `export const` | Exports and props are separate in runes mode | Use `bind:this={a}` and access `a.foo` |
| `$bindable` undefined parent value | Parent passes `undefined` to a `$bindable` prop with a default | Ambiguous state between parent/child defaults | Always pass a defined value from the parent when binding |
| SSR: `$effect` not executing | Side effect doesn't run during server render | `$effect` is browser-only by design | Move SSR-needed logic to `$derived`, component initialization, or SvelteKit `load` functions |

### Mitigation Code Examples

```svelte
<script lang="ts">
  import { untrack } from 'svelte'

  let items = $state<string[]>([])
  let log = $state<string[]>([])

  // ❌ INFINITE LOOP — reads items (dep), writes items
  $effect(() => {
    items.push('side effect item')
  })

  // ✅ FIX 1 — untrack the read so items is not a dependency
  $effect(() => {
    const snapshot = untrack(() => items)
    if (snapshot.length === 0) {
      untrack(() => items.push('initial'))
    }
  })

  // ✅ FIX 2 — make log a plain array (no $state) if only appended in effects
  let plainLog: string[] = []
  $effect(() => {
    plainLog.push(`count changed: ${items.length}`)
  })

  // ✅ FIX 3 — use $derived instead of $effect for computed values
  const itemCount = $derived(items.length)
</script>
```

---

## 7. Anti-Patterns

```svelte
<script lang="ts">
  // ❌ ANTI-PATTERN: bare let in runes mode (not reactive)
  let count = 0

  // ✅ CORRECT
  let count = $state(0)
</script>

<!-- ❌ ANTI-PATTERN: modifying a prop directly -->
<script lang="ts">
  let { value } = $props()
  value = 'new'  // runtime warning
</script>

<!-- ✅ CORRECT: use $bindable or emit a callback -->
<script lang="ts">
  let { value = $bindable('') } = $props()
  // or
  let { value, onchange }: { value: string; onchange?: (v: string) => void } = $props()
</script>

<!-- ❌ ANTI-PATTERN: $derived with side effects -->
<script lang="ts">
  const bad = $derived(() => {
    fetch('/api/data')  // side effect in $derived
    return count * 2
  })
</script>

<!-- ✅ CORRECT: $derived is pure, $effect handles side effects -->
<script lang="ts">
  const doubled = $derived(count * 2)
  $effect(() => {
    if (count > 0) fetch('/api/data')
  })
</script>

<!-- ❌ ANTI-PATTERN: createEventDispatcher (runes mode) -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()
  dispatch('select', value)
</script>

<!-- ✅ CORRECT: callback props -->
<script lang="ts">
  let { onselect }: { onselect?: (v: string) => void } = $props()
  onselect?.(value)
</script>

<!-- ❌ ANTI-PATTERN: writable store for shared state -->
<script lang="ts">
  import { writable } from 'svelte/store'
  export const count = writable(0)
</script>

<!-- ✅ CORRECT: $state in .svelte.ts shared module -->
// state/count.svelte.ts
export const counter = $state({ value: 0 })

<!-- ❌ ANTI-PATTERN: new Component() constructor -->
// main.ts
import App from './App.svelte'
new App({ target: document.body })

// ✅ CORRECT
import { mount } from 'svelte'
mount(App, { target: document.body })
```

---

## 8. Migration from Svelte 4

### Automated Migration

```bash
# Run the official migration tool
npx sv migrate svelte-5
```

This handles: `let` → `$state`, `$:` → `$derived`/`$effect`, `export let` →
`$props()`, `on:event` → event attributes, `<slot>` → snippets (partial).

### Patterns Requiring Manual Review

| Pattern | Why Manual | Svelte 5 Replacement |
|---|---|---|
| `$$props` | Renamed | `let { ...rest } = $props()` |
| `$$restProps` | Renamed | `let { known, ...rest } = $props()` and `{...rest}` |
| `createEventDispatcher` | Architecture change | Callback props |
| Named slots with `let:` bindings | Complex transformation | Parametric snippets `Snippet<[T]>` |
| `<svelte:component this={comp}>` | Still works but see note | Valid in v5; no change needed |
| `bind:` on component exports | Disallowed in runes mode | `bind:this` + access export property |
| Stores used for local state | Still works; not idiomatic | `$state` in component or `.svelte.ts` |

---

## 9. Production Checklist

### Correctness
- [ ] All reactive variables declared with `$state()` (no implicit reactive `let`)
- [ ] Computed values use `$derived` / `$derived.by` (not `$effect` with manual assignment)
- [ ] `$effect` callbacks are free of circular reads/writes — verified with `$inspect.trace()`
- [ ] `$bindable` props always receive defined (non-undefined) values from parents
- [ ] No `createEventDispatcher` — replaced with callback props
- [ ] No `on:event` directive — replaced with HTML event attributes

### SSR Safety
- [ ] Browser-only code (DOM APIs, `window`, `document`) is inside `$effect` or `onMount`
- [ ] `$derived` values are SSR-safe (no browser API calls)
- [ ] `$props.id()` used for ARIA linkage (stable across SSR hydration)
- [ ] `hydrate()` used (not `mount()`) when attaching to server-rendered HTML

### Performance
- [ ] Large frozen objects use `$state.raw()` to avoid deep proxy overhead
- [ ] `$effect` does not perform expensive synchronous operations — debounce or throttle where needed
- [ ] `untrack()` used to avoid unintended reactive subscriptions in effects

### TypeScript
- [ ] All `$props()` destructuring has explicit type annotation or `interface Props`
- [ ] `Snippet` / `Snippet<[T]>` imported from `'svelte'` for slot-equivalent typing
- [ ] `$state<T>` annotated when initial value is ambiguous (`null`, `[]`, `{}`)

### Migration Completeness
- [ ] No remaining `export let` in runes-mode files
- [ ] No remaining `<slot>` tags — replaced with `{#snippet}` / `{@render}`
- [ ] No remaining `new Component()` constructor calls
- [ ] `npx sv migrate svelte-5` run and output reviewed

---

## 10. Version Information

- **Current stable:** 5.55.5 (May 2026)
- **Initial Svelte 5 stable release:** October 2024 (5.0.0)
- **Breaking changes from Svelte 4:**
  - `new Component()` constructor removed for runes-mode components
  - `$$props`, `$$restProps` removed — use `$props()` rest spread
  - `createEventDispatcher` removed in runes mode
  - `<slot>` deprecated (still works, emits warnings)
  - `on:event` directives deprecated (still compile, emit warnings)
  - `$:` reactive labels deprecated (still compile, different behavior in edge cases)
  - `hydratable` compiler option removed (always on)
  - Exporting reassignable variables from runes components disallowed
- **Compiler migration tool:** `npx sv migrate svelte-5`
- **Changelog:** https://github.com/sveltejs/svelte/blob/main/packages/svelte/CHANGELOG.md
