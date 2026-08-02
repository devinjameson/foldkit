---
'foldkit': minor
---

Let the `flags` Effect require services from the `resources` Layer.

`flags` was typed `Effect<Flags>`, so an app whose flags and its Commands or Subscriptions needed the same service had to discharge the requirement inside `flags` with `Effect.provide(flags, AppLayer)` and pass the same `AppLayer` again as `resources`. Effect memoizes a Layer per build, and those are two builds, so the app silently got two instances of whatever the Layer holds. For a stateless Layer that is invisible. For one holding a socket, a connection, a cache, or a `Ref`, half the app talked to one instance and half to the other.

`flags` now accepts `Effect<Flags, never, Resources>`, where `Resources` is what the `resources` Layer provides. The runtime resolves flags through the same cached build it gives Commands and Subscriptions, so the Layer is constructed once and shared. A requirement that `resources` does not provide is a compile error at the `makeApplication` and `makeElement` boundaries rather than a missing-service failure at runtime, whenever `Resources` is inferred from `resources` rather than named explicitly in the type arguments.

The error channel stays `never`. Every other effectful boundary in the runtime pins it there too, including `resources` itself, Commands, and Subscription streams, and `flags` resolve before there is a Model or a Message channel to carry a failure. Handling errors inside `flags` with `Effect.catch` remains the contract.

Existing call sites keep compiling unchanged: an `Effect<Flags>` requires nothing, and providing a Layer inside `flags` is still the right placement for a service used only at startup, such as `KeyValueStore` reading persisted state. Moving a shared Layer out of `flags` and into `resources` is what stops the second build, which is the point.

Flags resolve before `init`, so an app that declares them builds the `resources` Layer at startup rather than on its first Command, whether or not the flags Effect touches it. A Layer that fails to build still reaches the crash view unless the flags Effect itself needs the broken service, in which case startup fails before the first render, where there is no Model to render a crash view against. Neither cause is swallowed, so a flags Effect that fails for its own unrelated reason stays visible alongside the build error.
