# Managed Resources

## Overview

Resources live for the entire application lifecycle. But some resources are heavy and should only be active while the Model is in a particular state, like a camera stream during a video call, a `WebSocket` connection while on a chat page, or a Web Worker pool during a computation. Managed Resources provide Model-driven acquire/release lifecycle, using the same deps-diffing engine as Subscriptions.

:::Info{label="The restaurant analogy"}
If resources are kitchen equipment (permanent, always on), Managed Resources are specialty ingredients sourced on demand. When the menu shifts to a seafood special (Model state changes), the kitchen orders in fresh lobster and sets up the shellfish station. When the special ends, the lobster goes back to the supplier and the station is broken down. If the chef (Command) tries to plate lobster when it’s not in season, they get a clear signal: `ResourceNotAvailable`. And if the special changes from Maine lobster to king crab (params change), the old stock is returned and new stock is sourced, just like switching camera resolutions triggers release and reacquire.
:::

Define a Managed Resource identity with `ManagedResource.tag`, then wire its lifecycle with `ManagedResource.make`. The `modelToMaybeRequirements` function returns `Option.some(params)` when the resource should be active, and `Option.none()` when it should be released.

::Snippet{name="managedResources" label="Managed Resources example"}

When requirements change, the runtime handles the lifecycle automatically. If `modelToMaybeRequirements` transitions from `Option.none()` to `Option.some(params)`, the resource is acquired and `onAcquired` is sent. When it goes back to `Option.none()`, the resource is released and `onReleased` is sent. If the params change while active (e.g. switching cameras), the old resource is released and a new one is acquired with the new params.

If acquisition fails, `onAcquireError` is sent as a Message. The resource daemon continues watching for the next deps change. A failed acquisition does not crash the application.

## Accessing Managed Resources in Commands {#accessing-managed-resources}

Commands access the resource value via `.get`. Since the resource might not be active, `.get` can fail with `ResourceNotAvailable`. The type system enforces this: your Command won’t compile unless you handle the error.

::Snippet{name="managedResourcesCommand" label="Managed Resource command example"}

This is the same `catchTag` pattern you already use for Command errors. If your Model correctly gates Commands (only dispatching `takePhoto` after `AcquiredCamera` has been received), the `catchTag` is a safety net that never fires. But if your Model logic has a bug, you get a graceful error message instead of a crash.

## Building a Layer in acquire

When a resource’s setup and teardown are already packaged as an Effect `Layer`, you do not have to unpack it by hand. `acquire` runs with the resource-lifetime `Scope` in its context, the same scope the runtime closes on release or re-acquire. So `Layer.build` registers the Layer’s finalizers on it, and you map the built context down to the bare service value.

::Snippet{name="managedResourcesLayer" label="Layer-backed Managed Resource example"}

The resource tag holds the bare service value, so Commands read it through `.get` with no wrapper to destructure. Any finalizer registered during `acquire`, whether through `Layer.build` or `Effect.addFinalizer`, tears down with the resource, so `release` is simply `() => Effect.void`. The explicit `release` callback still runs first, then the scope finalizers, matching the last-in-first-out order Effect uses for any scope.

## Composing Child Submodels

A child Submodel owns its Managed Resources in its own Model and Message terms, built with `ManagedResource.make` and knowing nothing about any parent. `ManagedResource.lift` translates that record into the parent through a single Model lens and a single Message wrapper, the same shape as update delegation and `Subscription.lift`. `ManagedResource.aggregate` then combines a root-level record with any lifted child records into the single record `makeApplication` expects, throwing at startup on duplicate keys.

Unlike `Subscription.lift`, `toChildModel` returns an `Option`. A Managed Resource already speaks in `Option` (`modelToMaybeRequirements` returns `Option.none()` to release), so a Submodel embedded as `Option` that is not mounted is just another `none`: a missing child releases the resource through the same channel.

::Snippet{name="managedResourcesLift" label="Managed Resources composition example"}

These verbs compose across Submodel levels the same way their Subscription counterparts do. The [Subscription Organization](/patterns/subscription-organization) page traces the full leaf-to-root walkthrough. It uses Subscriptions for its example, but the shape is identical here: `make` at each level, `lift` each child, `aggregate` the results.

:::Info{label="Resources vs Managed Resources"}
Use `resources` for things that live forever (an `RpcClient`, an analytics client). Use `managedResources` for things tied to a Model state (camera streams, an `AudioContext`, `WebSocket` connections).
:::

With resources and Managed Resources, your app can work with any browser API. But what happens when something goes seriously wrong, like an unrecoverable error in update, view, or a Command? The next page covers crash views.
