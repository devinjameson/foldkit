# Freeze Model

## Overview

Foldkit treats the Model as immutable, but TypeScript’s `readonly` is a compile-time hint, not a runtime guarantee. Code like `model.items.push(newItem)` still runs. When it does, reference equality no longer detects the change, so Subscriptions may not fire and the DOM patch can skip nodes that should have updated.

To catch mutations early, Foldkit deep-freezes the Model after `init` and after every `update`. Any accidental write throws a `TypeError` at the exact call site with a clear stack trace, instead of silently corrupting state.

Freezing runs in dev mode (gated behind `import.meta.hot`), so there is zero runtime cost in production builds. Set `freezeModel` to `false` to disable it entirely.

## Scope

Freezing is scoped to plain objects and arrays. Effect-tagged values such as `Option`, `Result`, `DateTime`, `HashSet`, `HashMap`, and `Chunk` are left untouched because they rely on `Hash.cached`, which lazily writes to the instance on the first `Equal.equals` or `Hash.hash` call. Freezing them would crash legitimate Effect operations. `Date`, `Map`, `Set`, `File`, and class instances are also left alone for the same reason.

`Option.some` is special-cased: the wrapper stays intact so `Hash.cached` still works, but the payload inside is frozen. So `Option.some({ items: [...] })` still throws if you try to mutate the inner array.

Messages are never frozen. They routinely carry `Option` and `DateTimeFromSelf` payloads that rely on the same `Hash.cached` mechanism, and they’re short-lived enough that the dev-time safety value is low.

Cost is amortized to O(diff) per update: already-frozen values are short-circuited, and `evo` preserves unchanged branches by reference, so each update only pays to freeze the newly-created nodes.
