---
'foldkit': minor
---

Add `expectOutMessage` and `expectNoOutMessage`.

`scene` already accepted a Submodel's three-tuple update and tracked its `Option<OutMessage>`, but asserting on it required `tap`. The new steps mirror `expectOutMessage` and `expectNoOutMessage`, failure messages included.

```ts
scene(
  { update, view },
  given(initialModel),
  click(role('button', { name: 'Log out' })),
  expectOutMessage(RequestedLogout()),
  Subscription.emit(CompletedAction()),
  expectNoOutMessage(),
)
```

The tracked value is the third element of the most recent update result that had one. An update branch that returns a two-tuple leaves the previous value in place, so keep every branch of an OutMessage-returning update on the three-tuple shape, returning `Option.none()` when there is nothing to report.
