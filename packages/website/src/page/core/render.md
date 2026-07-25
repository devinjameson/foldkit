# Render

## Overview

The `Render` module exposes two primitives for synchronizing with the browser's render cycle: `Render.afterCommit` resumes once the runtime has applied the latest VDOM patch to the DOM. `Render.afterPaint` resumes after the prior state has been displayed to the user. Both are Effects you yield inside your own [Commands](/core/commands) or [Subscriptions](/core/subscriptions).

The runtime batches renders to `requestAnimationFrame`. A Command runs on the microtask queue right after the dispatching Message, which means a synchronous DOM read or write inside that Command sees the tree from before the latest model was patched in. `Render.afterCommit` is how you wait for the matching patch to apply.

## When to reach for it

Reach for `Render.afterCommit` when you need to read or measure an element that was just brought into existence (or moved, or had attributes changed) by the same Message. Custom focus, custom scroll restoration, `IntersectionObserver` setup inside a Subscription, `getBoundingClientRect` for layout work. The [Dom helpers](/api-reference/dom) already gate themselves with this internally, so reach for `Render.afterCommit` directly when building your own.

Reach for `Render.afterPaint` when you need the browser to actually display the prior state before you change to the next one, typically for CSS transition orchestration. A single `requestAnimationFrame` commits the DOM but the pixels have not been painted yet. A second one resumes after that paint is visible, so the from-state is on screen and the to-state can transition smoothly to it.

::Snippet{name="renderBasic" label="Render examples"}

## Full API surface

The [Render API reference](/api-reference/render) lists every primitive with its signature and an inline example.
