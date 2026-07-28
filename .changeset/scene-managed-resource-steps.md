---
'foldkit': minor
---

Add `Scene.ManagedResource.acquire`, `Scene.ManagedResource.failAcquire`, and `Scene.ManagedResource.release`.

A ManagedResource dispatches lifecycle Messages through its declared hooks (`onAcquired`, `onAcquireError`, `onReleased`), and those Messages had no entry point into a scene. The new steps declare the lifecycle outcome the way `Scene.Command.resolve` declares a Command result, feeding the hook's Message through update and re-rendering.

Each step checks the current Model against the entry's `modelToMaybeRequirements` gate first, mirroring the runtime's `None` to `Some` and `Some` to `None` transitions: `acquire` and `failAcquire` throw unless the Model requests the resource, and `release` throws while it still does, so a scene must drive the Model transition through real steps before declaring the outcome. The runtime's `Some` to `Some` re-acquire transition (structurally changed requirements, which dispatches `onReleased` and then `onAcquired` while the Model still requests the resource) has no step yet.

Unlike Commands and Mounts, these steps leave nothing pending: each dispatches its Message through update immediately, so there is nothing to resolve or acknowledge at the end of the scene. `acquire` takes exactly the arguments the entry's `onAcquired` declares: a handler that consumes the acquired value (what the entry's `acquire` Effect would have produced) requires it here, and a handler like `() => Connected()` that ignores the value takes none, so a test never fabricates a resource value nobody reads. Entries preserve the handler's type to make this work, so `ManagedResource.Entry` gained an `OnAcquired` type parameter (defaulted, so existing type annotations are unaffected).

```ts
Scene.scene(
  { update, view },
  Scene.with(initialModel),
  Scene.click(Scene.role('button', { name: 'Open feed' })),
  Scene.ManagedResource.acquire(resources.feedSocket, { socketId: 'sock-1' }),
  Scene.expect(Scene.role('status')).toHaveText('Connected'),
  Scene.click(Scene.role('button', { name: 'Close feed' })),
  Scene.ManagedResource.release(resources.feedSocket),
  Scene.expect(Scene.role('status')).toHaveText('Disconnected'),
)
```
