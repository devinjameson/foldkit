# Slow Warnings

## Overview

Every Message that flows through your app first runs `update`. If that Message changes the Model, Foldkit then re-evaluates `subscriptions` dependency structs, calls `view` to rebuild the virtual DOM, and patches the real DOM. If any one of these synchronous phases blocks the main thread for too long, it causes dropped frames, stuck input, and visible jank.

Foldkit measures all four phases in development by default. The `slow` runtime config lets you choose measured phases, override threshold budgets, and route warning contexts. When a phase exceeds its threshold, Foldkit fires a callback you control. The default is a `console.warn` with a remediation hint. Pass an `onSlow` callback to forward every slow-phase context to Sentry, an in-app diagnostics panel, or any other sink.

Warnings run in dev mode by default (gated behind `import.meta.hot`), so production builds pay nothing. Pass `show: 'Always'` to enable them in every environment.

The [Slow Warnings example](/example-apps/slow-warnings) intentionally trips each phase with the default thresholds, then records the actual callback payloads in the UI.

## When to act on a warning {#when-to-act}

:::Info{label="Treat warnings as signals, not problems to silence."}
A fired warning is a prompt to investigate, not a defect to clear. Confirm the cause with a profiler before changing code. A wasted [createLazy](/core/view-memoization#create-lazy) with a low cache hit rate is slower than no `createLazy`. Prefer correct, clear code first; performance fixes have a maintenance cost.
:::

Default thresholds are intentionally generous. Crossing them in dev mode is common and often fine in production: HMR overhead, DevTools recording, a JS thread parked under a breakpoint, and slow CI workers all inflate measurements. Validate that the slowness is real by reproducing in a production build before optimizing.

When you do optimize, measure before and after. Keep the change only if the profile shows a clear improvement. Otherwise, revert it and look elsewhere.

## Optimization playbook {#playbook}

The warning tag tells you where the main thread time was spent. It does not mean every phase needs a different architecture. Most fixes are about keeping render-only work in the render path, making that path skippable, and using update or Commands only when that matches the actual Model transition.

- **Render-only derived data:** If a value exists only to decide what to draw, compute it from `view` inputs and put the expensive subtree behind [createLazy](/core/view-memoization#create-lazy) or `createKeyedLazy`. Do not precompute it in `update` just to make a View warning disappear.
- **Slow View or Patch:** Start with stable keys for mapped lists and memoized boundaries around large regions. A lazy boundary helps only when its function and arguments often keep the same references between renders. If the inputs change every render, the cache misses every render.
- **Slow Update:** Start with the Message in the warning context. If that branch is calculating render-only data, move the calculation to the view path and memoize the affected subtree. If the branch is truly changing application state, make the expensive work run only for Messages that can change its inputs and reduce the amount of work in that transition.
- **Derived state in the Model:** Treat this as a last resort for synchronous state transitions, not the default rendering strategy. Use it only when profiling shows recomputation is the bottleneck, the derived value belongs with the Model, and update can maintain it incrementally from the same Messages that change its source data.
- **Commands:** A Command can reduce update cost because it runs after `update`, but synchronous CPU work in a Command can still block the main thread. Use that shape when the work is an effect or a deliberately asynchronous computation.
- **Slow SubscriptionDependencies:** `modelToDependencies` should be a cheap projection from already-modeled fields to the values a stream reads. Avoid scanning, sorting, serializing, or building large dependency objects there.

## Measured phases {#phases}

Foldkit measures four phases independently. Each has its own default budget and attribution context:

- **view:** Building the next VNode tree from the Model. Default budget 16ms (one frame at 60fps). If the work is render-only, keep it in the view path and memoize the expensive subtree.
- **update:** The reducer call that produces the next Model. Default budget 4ms (a quarter-frame). Runs synchronously for every Message. Use the Message in the warning context to find the branch that spent the time.
- **patch:** Diffing the new VNode tree against the previous one and applying changes to the DOM. Default budget 8ms (half a frame). Stable keys and memoized subtrees let the diff skip work.
- **subscription dependencies:** Each subscription extracts a dependency struct from the Model on every Model change. Default budget 2ms per subscription. The callback receives a subscriptionKey for attribution.

## Configuration

If you omit `slow`, Foldkit enables all four phases in development with their default thresholds. Pass `slow: false` to disable every phase at once.

If you pass a `slow` object, Foldkit still measures every phase by default. Use `measuredPhases` to choose which phases are measured at runtime and `thresholdOverrides` to replace default budgets for specific phases. Omitted threshold override fields keep Foldkit defaults, and overrides for phases outside `measuredPhases` are ignored. For example, `measuredPhases: ['View', 'Patch']` measures only view and patch. If you do not need to customize anything, omit `slow` entirely; that already keeps the default development warnings for all phases.

Top-level `show` and `onSlow` apply to every measured phase. Passing `onSlow` replaces Foldkit's default `console.warn` sink, so Foldkit will not also warn for tags your callback ignores. The callback receives a tagged `SlowContext` union even when `measuredPhases` selects a subset; discriminate on `_tag` (`'View' | 'Update' | 'Patch' | 'SubscriptionDependencies'`) to route per phase or forward all four to a single sink:

::Snippet{name="slowConfig" label="Configuring slow-phase warnings"}

When a View or Patch warning genuinely points at expensive rendering, the first thing to try is memoization. The [view memoization](/core/view-memoization) page covers `createLazy` and `createKeyedLazy`, two tools for caching view subtrees so they skip both VNode construction and DOM diffing.
