---
'foldkit': minor
---

Let Scene preserve multiple OutMessages emitted by one update-producing step in runtime order and assert the complete sequence with `expectOutMessages`.

This changes OutMessage assertions after `Command.resolveAll`, `Command.resolveAllExact`, and `Mount.resolveAll`. `expectOutMessage` now requires exactly one OutMessage from the whole step, and `expectNoOutMessage` requires none. Use `expectOutMessages` when several resolvers emit OutMessages. When a step emits several, the singular `SceneSimulation.outMessage` field is `undefined` because no single value can represent the result.
