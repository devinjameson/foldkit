---
'foldkit': minor
---

`Machine.transition` now returns `Update.Return<State, Message, R>` instead of a two-element tuple containing the next state and Commands. The Machine state is the return's `model`, and an ignored Message omits `commands`.

Before:

```typescript
const [nextState, commands] = machine.transition(state, message)
```

After:

```typescript
const stateTransition = machine.transition(state, message)

stateTransition.model
stateTransition.commands
```

The record can also serve directly as the child update in `Update.foldChild`. Use `Machine.step` instead when code needs to distinguish a `Transitioned` result from an `Ignored` result or inspect Edge metadata.
