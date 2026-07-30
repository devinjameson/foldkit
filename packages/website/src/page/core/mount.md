# Mount

## Overview

Most Foldkit code is declarative. The [view](/core/view) is a function from Model to Html. It doesn’t reach into the DOM, it doesn’t hold references, it doesn’t run side effects. That purity is what makes Foldkit programs predictable.

Mount binds an imperative, element-scoped side effect to a view element for as long as that element lives in the DOM. It sets up when the element enters and tears down when the element leaves. `OnMount` is the seam where view code drops down to imperative work on the live element. The common shape, `Mount.define`, runs an `Effect<Message>` that produces exactly one Message at acquire and keeps the scope open until the element unmounts. Cleanup is paired with setup via `Effect.acquireRelease` inside the Effect. For Mounts that emit a continuum of events from observers or listeners on the element, `Mount.defineStream` takes a `Stream<Message>` instead.

**Pick by the Mount’s job.** Use `Mount.define` when the Mount produces a single Message at acquire: anchor positioning, portaling, third-party library instantiation, reading element geometry on mount. Use `Mount.defineStream` only when the Mount’s job is to emit a continuous stream of Messages from listeners or observers attached to the element: scroll events, IntersectionObserver entries, MutationObserver records. Both forms require at least one declared result Message. Fire-and-forget Mounts follow the same convention as fire-and-forget Commands: declare a `Completed*` Message that `update` no-ops on, so DevTools, Scene tests, and replay still see the side effect.

:::Info{label="Functional core, imperative shell"}
The view describes what should be on screen. `OnMount` describes what to do at the boundary where the virtual DOM meets the real one. The Message the Effect produces flows back through update like any other Message, and cleanup is registered via `Effect.acquireRelease` inside the Effect, paired with the setup so "do the thing" and "undo the thing" stay together.
:::

:::Info{label="Mounts surface in tests"}
Scene tracks every `OnMount` in the rendered view as a pending Mount and requires the test to acknowledge each one with the result Message its factory would produce at runtime. See [Scene](/testing/scene) for the full contract.
:::

## When to Reach for Mount

Mount is one of the primitives Foldkit offers for side-effecting work. Pick by what causes the side effect, not by what feels most ergonomic.

[Command](/core/commands) fires a one-time side effect because `update` just returned it. The cause is a Message that just dispatched. `FocusInput` after `OpenedDialog`, `FetchWeather` after `ClickedRefresh`, `SaveTodos` after `EditedTodo`. Navigation, network, storage, analytics, and focus-on-state-change all belong in Commands.

Mount fires a per-instance lifecycle effect bound to a VNode existing in the rendered tree. The cause is the element appearing, and the author needs the live `Element` handle. Anchor positioning for floating panels, backdrop portaling, attaching observers to a specific element, handing the element to a third-party library: these are Mount cases.

[Subscription](/core/subscriptions) catches a long-running external event source like timers, document or window events, system theme changes, or `WebSocket` message streams. It emits the events as Messages. Its lifetime is gated by a Model condition via `modelToDependencies`. Subscriptions look like `Mount.defineStream` in shape (both produce a `Stream<Message>` with `Effect.acquireRelease` cleanup), but the cause differs: Mount fires because an element appeared in the DOM, Subscription fires because a Model condition became true.

[ManagedResource](/core/managed-resources) holds a stateful runtime object (a websocket, a camera stream, a third-party library instance) whose lifetime is tied to a Model condition AND whose handle is consumed by Commands via `yield*`. The condition determines lifetime; Commands do the work on the resource.

[CustomElement](/core/custom-element) covers the special case where the foreign DOM is a declarative web component: a hyphenated tag that exposes typed JS properties going in and dispatches `CustomEvent`s coming out. Shoelace, UI5, Spectrum, Lit, Stencil elements, and most modern web component libraries fit that shape. Declare the binding once with `CustomElement.define` and the element slots into the view like any other tag. Mount is the right reach only when the foreign element’s API is imperative instead.

:::Info{label="Don’t reach for Mount just because the work happens to coincide with an element appearing"}
Check what causes the work. If a Message just dispatched (like `Opened`), the cause is the Message, not the element. The element’s appearance is coincidentally co-timed with the Message but isn’t what causes the work. Use a Command returned from `update`’s handler instead. For example, focusing a search input when its dialog opens: the element appears, but the cause is `Opened`, not the input’s existence. A `FocusInput` Command returned from the `Opened` handler is the right shape.
:::

## Side Effects on Mount

Mount’s lifecycle is tied to the DOM node, not the VNode. VNodes are reconstructed on every render; DOM nodes persist across renders unless the differ decides to replace them. If the differ matches an existing DOM node (same tag, same identity, and for keyed list siblings the same key), the Mount keeps running: `insert` doesn’t re-fire and `destroy` doesn’t fire. If the differ replaces the node (different tag, changed view-function identity, mismatched key), the old Mount’s scope closes (running `acquireRelease` finalizers) and the new node gets a fresh Mount. An unkeyed reordered list reuses DOM positions for different logical rows instead of replacing them, so view-function identity and stable keys on mapped list items are what keep the differ from mis-matching elements across renders and accidentally transferring Mount state to the wrong element.

A typical Mount uses the element parameter to do DOM work that should pair with the element existing. Portal-to-body is the canonical small example: when this overlay element appears, move it to `document.body` so it escapes any clipping ancestor; when it unmounts, remove it. The Effect uses the element directly, the work is DOM manipulation, and the cleanup is registered via `Effect.acquireRelease` so it mirrors the setup.

::Snippet{name="mountPortalToBody" label="portal-to-body example"}

Cleanup is registered via `Effect.acquireRelease` inside the Effect, not as a separate hook. The runtime closes the Mount’s scope when the differ destroys the element, which runs the release. Pair the setup and the release in the same `acquireRelease` expression.

:::Info{label="Two practical rules for Mount"}
Both must hold. First, the factory uses the element parameter. Mount provides the live element handle, and that handle is what makes Mount distinct from the alternatives. If your factory doesn’t read or write the element, pick a different primitive. Second, the work is DOM measurement or DOM manipulation on that element: read its geometry, mutate its CSS, attach an observer to it, portal it, hand it to a third-party library. Anything else is a Command from update (network, storage, analytics, focus-on-transition, scroll lock for the page), a Subscription whose dependencies are derived from the Model (timers, document-level keyboard listeners, system theme observers), or a ManagedResource whose lifetime tracks a Model condition (a WebSocket connection, a camera stream). If you find yourself wanting a Mount that doesn’t use its element, the cause is a Model condition or a Message dispatch, not the element’s existence. Re-check the cause and pick the matching primitive.
:::

Only one Mount can attach per element. The differ’s hook system stores a single `insert`/`destroy` hook per VNode, so writing `[h.OnMount(A), h.OnMount(B)]` on the same element silently overwrites: the second `OnMount` replaces the first, and `A`’s factory never runs. If you need multiple lifetime-scoped behaviors on the same element (e.g. restore-scroll AND listen-for-scroll), bundle them into a single Mount that does both in its acquire and releases both in its release.

:::Warning{label="Mounts re-run during DevTools time-travel"}
When a user scrubs through history with the DevTools timeline, Foldkit re-renders the historical Model. Elements that carry `OnMount` fire their factories again as their VNodes are inserted, and the `acquireRelease` finalizers run as they are destroyed. The two rules above are what keep Mount work inherently replay-safe: DOM measurement is read-only, DOM manipulation on an element that exists in both live and time-travel views is idempotent, observer attachment paired with release is self-balancing. Anything that mutates external state (network calls, storage writes, focus-on-transition, scroll lock for the page, library instantiation keyed on Model rather than element) is unsafe to re-run during replay and therefore not a Mount.
:::

## Per-Instance Args {#args}

Mount factories often need a value that varies per instance: an element id to anchor against, the data driving a chart render, the stable host id another Mount will key on. Declare those values as `args` on `Mount.define` so the factory receives them as a typed record at view time. The shape mirrors [Commands](/core/commands): `Mount.define(name, args, ...results)(({ ...args }) => element => Effect<Message>)`. Calling the Definition with an args record at view time produces a MountAction the runtime feeds into `OnMount`. `Mount.defineStream` takes the same args overload; only the factory’s return type changes (from `Effect<Message>` to `Stream<Message>`). Every property below applies identically: captured-at-mount semantics, the args naming rule, and the post-mount-Model-change escape hatch.

Args carry per-instance inputs only. Everything else the factory needs comes from outside args: module-level constants via lexical scope, app-wide services via Foldkit `Resources`, Model-driven handles via `ManagedResources`, and any Effect service via `yield*` inside the factory body.

:::Info{label="Args surface in DevTools and tests"}
Mount args appear in DevTools alongside the Mount name, and Scene tests can match a specific instance by passing the same args record to `Mount.expectHas` or `Mount.resolve`. See [Scene](/testing/scene) for the Definition-vs-Instance matcher contract.
:::

:::Warning{label="Args are captured at mount, not refreshed on subsequent renders"}
The factory runs once when the element enters the DOM, with whatever arg values are passed at that moment. Every later render constructs a fresh `MountAction` with current arg values, but only the first invocation’s args ever execute. `OnMount` is bound to the differ’s `insert` and `destroy` hooks, with no `update` hook in between. Name args to express this lifecycle. Prefer `initialScroll` over `scroll`, `seedValue` over `value`. If you need Model changes to drive ongoing DOM behavior post-mount, the proximate cause is the Message that updated the Model. Dispatch a Command from `update`’s handler for that Message. The Command can find the element and do the imperative work. Don’t reach for a Subscription here. Subscriptions watch Model state via `modelToDependencies` to gate their lifetime, but their emissions come from external event sources (timers, document events, library callbacks), not from Model state itself. Translating Model changes into side effects is what `update` does on every Message, via the Commands it returns. This is different from the cases where Subscriptions do touch the DOM, and the distinction is worth naming. Subscriptions are Effect Streams that emit Messages. Their start and stop are diffed against dependencies derived from the Model via `modelToDependencies`: when the dependencies become satisfied the Stream’s body runs setup, and when they change the scope closes and any `Effect.acquireRelease` release runs. That makes Subscriptions the right fit when the lifetime of a DOM side effect is itself a Model condition: for example, applying `user-select: none` to the document while `isDragging` is true and undoing it when the drag ends sits naturally as one paired `Effect.acquireRelease` inside a Subscription whose dependency is `isDragging`. Subscriptions also handle the case where a DOM mutation has to run synchronously with the event itself, like calling `preventDefault` on a keydown listener: the Stream’s body is an Effect that can register the listener directly with the browser, so the listener runs in the same call stack as the browser’s event dispatch. Going through `update` would arrive after the browser had committed the default. Neither shape applies when an already-mounted element needs new DOM behavior in response to a Model change: the cause there is a Message that just dispatched, which is what Commands are for.
:::

## Third-Party Libraries

`OnMount` really earns its keep when a library owns its own DOM. Charts, code editors, map renderers, force-directed graphs: each expects a real element to render into and a way to be torn down later.

The factory takes the live `Element` (and its declared args, when any) and returns an `Effect<Message>`. The Mount’s scope is bound to the element’s lifetime: the Message the Effect produces is dispatched, and the scope is closed (running any registered `Effect.acquireRelease` finalizers) when the element unmounts. The Effect completes after producing its Message, but the scope stays open until the element unmounts so the cleanup runs at the right time. For Mounts that emit a continuum of events from observers or listeners on the element, `Mount.defineStream` takes a `Stream<Message>` instead and follows the same lifetime rules.

::Snippet{name="mountThirdPartyChart" label="OnMount example"}

:::Warning{label="Construct the handle inside the acquire body, never before it"}
`Effect.acquireRelease` only guarantees atomicity of "acquire body completes → release is registered." If you construct the chart (or map, or audio context, or any stateful handle) before calling `acquireRelease` and the acquire body just returns the existing handle (`Effect.sync(() => alreadyExistingValue)`), interruption between the construction and the registration leaves the handle dangling. The fix is to express the construction as the success value of the acquire Effect: `Effect.tryPromise(() => import(...)).pipe(Effect.map(({ Lib }) => new Lib(...)))` for async imports, `Effect.sync(() => new Thing(...))` for sync construction. The discipline is: whatever the release function needs as input must be the success value of the acquire Effect.
:::

The Model owns the data going in. The library owns its rendered subtree. The runtime owns the lifecycle.

:::Info{label="What if the factory emits or fails after the element is removed?"}
The runtime handles this. When the element unmounts, Foldkit interrupts the Mount’s fiber. Interrupt propagates through the scope, running any registered `Effect.acquireRelease` finalizers (the canonical cleanup mechanism). Messages produced after interrupt are discarded; the Model never sees a Mount Message for an element that no longer exists.
:::

Mount binds work to an element’s lifetime in the rendered tree. For a scoped Stream gated by a slice of your Model instead, one that runs while the slice holds its value and may emit Messages while it does, Foldkit has [Subscriptions](/core/subscriptions).
