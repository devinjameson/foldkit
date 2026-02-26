# Dev-mode slow view build warning

Surface a `console.warn` during development when a `view()` call takes longer than a threshold, alerting developers to performance problems that may be invisible on fast hardware but painful on user devices.

## Motivation

- View builds that take 150ms on an M3 MacBook Pro can take 600ms+ on budget hardware
- Developers rarely test on slow devices — a framework-level warning catches problems early
- The warning is pedagogical: it nudges toward the idiomatic fix (move computation into `update`, virtualize long lists, etc.)
- Precedent: React StrictMode, Next.js slow data fetch warnings, Svelte large DOM warnings

## Design decisions

### Threshold

Use `16` ms (one frame at 60fps). A view build that exceeds a single frame budget is already causing dropped frames. This is aggressive but correct — the view function should be building a virtual DOM tree, not doing heavy computation. Developers can always inspect and decide whether to act.

If `16` proves too noisy in practice, bump to `50` (three dropped frames) — but start strict.

### What to time

Time the `view(model)` Effect only — not the `patch()` call. The view build is the part the developer controls. Patch duration depends on Snabbdom and DOM size, which is less directly actionable.

### Warning format

```
[foldkit] Slow view: 42.3ms (budget: 16ms)
```

Short, scannable, includes both the actual duration and the budget so the developer can gauge severity.

### Rate limiting

No debounce or "warn once" — every slow render logs. If the view is consistently slow, the console fills up, which is appropriate pressure. Developers who are aware and working on it can filter `[foldkit]` in devtools.

### Dev-only guard

Gate behind `import.meta.hot` — the same mechanism foldkit already uses for HMR model preservation. In production builds, Vite strips the dead branch entirely, so there is zero runtime cost.

## Implementation

### Scope

`packages/foldkit/src/runtime/runtime.ts` — the `render` function (lines 419–434)

### Changes

1. Add a module-level constant:

```ts
const SLOW_VIEW_THRESHOLD_MS = 16
```

2. Modify `render` to time the view build:

```ts
const render = (model: Model) =>
  Effect.gen(function* () {
    const viewStart = performance.now()
    const nextVNodeNullish = yield* view(model)
    const viewDuration = performance.now() - viewStart

    if (import.meta.hot && viewDuration > SLOW_VIEW_THRESHOLD_MS) {
      console.warn(
        `[foldkit] Slow view: ${viewDuration.toFixed(1)}ms (budget: ${SLOW_VIEW_THRESHOLD_MS}ms)`,
      )
    }

    const maybeCurrentVNode = yield* Ref.get(maybeCurrentVNodeRef)
    const patchedVNode = yield* Effect.sync(() =>
      patchVNode(maybeCurrentVNode, nextVNodeNullish, container),
    )
    yield* Ref.set(maybeCurrentVNodeRef, Option.some(patchedVNode))
  }).pipe(
    Effect.provideService(Dispatch, {
      dispatchAsync,
      dispatchSync,
    }),
  )
```

### What stays the same

- No new config options, no new types, no new exports
- No changes to `RuntimeConfig`, `makeElement`, `makeApplication`, or `run`
- The `Dispatch` service provision and `patchVNode` logic remain identical

## Future considerations

- **Patch timing:** could add a second timing around `patchVNode` with a separate threshold, but defer until there's evidence developers need it
- **Configurable threshold:** could add an optional `slowViewThresholdMs` to `RuntimeConfig`, but avoid the complexity until someone asks
- **Performance overlay:** a visual indicator (like Vite's error overlay) instead of console — significantly more work, defer unless console warnings prove insufficient
