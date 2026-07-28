---
'foldkit': minor
---

Add `Scene.Subscription.emit` for driving a Message into a running scene.

Messages whose real cause is a Subscription (a timer tick, a WebSocket frame, a global listener) had no entry point into a scene; every Message had to originate from a DOM event, a Command resolution, or a Mount result. `Scene.Subscription.emit(message)` feeds such a Message through update mid-chain and re-renders like any other step. It follows the existing cause-named step namespaces (`Scene.Command.*`, `Scene.Mount.*`). Do not reach for it when the Message has a DOM affordance; click the actual button instead.

```ts
Scene.scene(
  { update, view },
  Scene.with(initialModel),
  Scene.expect(Scene.role('status')).toHaveText('count: 0'),
  Scene.Subscription.emit(Ticked()),
  Scene.expect(Scene.role('status')).toHaveText('count: 1'),
)
```

Like interactions, `emit` throws if unresolved Commands, unresolved Mounts, or unacknowledged unmounts are pending.
