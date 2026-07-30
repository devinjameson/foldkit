---
'foldkit': minor
---

Add `Scene.expectOutMessage` and `Scene.expectNoOutMessage`.

`Scene.scene` already accepted a Submodel's three-tuple update and tracked its `Option<OutMessage>`, but asserting on it required `Scene.tap`. The new steps mirror `Story.expectOutMessage` and `Story.expectNoOutMessage`, failure messages included.

```ts
Scene.scene(
  { update, view },
  Scene.with(initialModel),
  Scene.click(Scene.role('button', { name: 'Log out' })),
  Scene.expectOutMessage(RequestedLogout()),
  Scene.Subscription.emit(CompletedAction()),
  Scene.expectNoOutMessage(),
)
```

The tracked value is the third element of the most recent update result that had one. An update branch that returns a two-tuple leaves the previous value in place, so keep every branch of an OutMessage-returning update on the three-tuple shape, returning `Option.none()` when there is nothing to report.
