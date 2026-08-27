---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/oxlint-plugin': minor
---

Take every `Mount.define` and `Mount.defineStream` input as a named field, with the work in a single flat `execute`.

Both constructors took their inputs positionally, with the result Messages as a variadic tail and the work supplied by a second call. With args declared, that second call was itself curried: `args => element => Effect<Message>`. The outer function ran the moment a view constructed the MountAction, so anything an author wrote between the two arrows ran on every render, inside a pure view. `Command.define` had the same hazard and defers its body with `Effect.suspend`; a Mount had no equivalent.

Inputs are now named fields on a config object: `args` declares the args Schema, `messages` lists the Messages the Mount can produce, and `execute` does the work. `execute` takes one parameter that carries the live element as `element` alongside the declared args, so the curried middle step is gone. Constructing a MountAction now runs nothing at all; the runtime calls `execute` when the element enters the DOM.

`execute` keeps the same shape whether or not `args` is declared, because a Mount always has an element. An args field named `element` is rejected where you declare it, since it would collide with the element `execute` receives.

## Migration

Move each positional argument to its field, wrap the result Messages in an array, and collapse the two arrows into one `execute` that destructures `element` alongside the args.

```ts
// before
const AnchorPopover = Mount.define(
  'AnchorPopover',
  { buttonId: S.String, anchor: AnchorConfig },
  CompletedAnchorPopover,
)(({ buttonId, anchor }) => element => Effect.gen(function* () { ... }))

// after
const AnchorPopover = Mount.define('AnchorPopover', {
  args: { buttonId: S.String, anchor: AnchorConfig },
  messages: [CompletedAnchorPopover],
  execute: ({ element, buttonId, anchor }) => Effect.gen(function* () { ... }),
})
```

A Mount with no args omits `args` and keeps the same `execute`.

```ts
// before
const PortalToBody = Mount.define('PortalToBody', CompletedPortalToBody)(
  element => Effect.gen(function* () { ... }),
)

// after
const PortalToBody = Mount.define('PortalToBody', {
  messages: [CompletedPortalToBody],
  execute: ({ element }) => Effect.gen(function* () { ... }),
})
```

`Mount.defineStream` migrates the same way, with `execute` returning a `Stream<Message>`.

`@foldkit/ui` now requires `foldkit` 0.155.0 or newer because its Mount definitions use this config shape.

`foldkit/mount-factory-must-use-element` reads the new shape. It looks for `element` in `execute`'s destructuring pattern, and reports on `execute` itself. A Mount whose `execute` ignores its element is still an error: the element is the reason a Mount exists, and work that does not need it belongs in a Command, Subscription, or ManagedResource.

Destructure `element` and the rule checks the read, reading through a default value so `{ element = document.body }` is still checked. Reading `input.element` off an unpacked parameter is checked too. Hand the whole input somewhere the rule cannot follow, such as `attachObserver(input)` or `input[key]`, and it stops checking rather than reporting a Mount that does use its element. Reading only some other field off that input still reports, and so does an `execute` that never references its parameter at all.
