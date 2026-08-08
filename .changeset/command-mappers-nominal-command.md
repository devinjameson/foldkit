---
'foldkit': patch
---

Type `Command.mapEffect`, `Command.mapMessage`, and `Command.mapMessages` against `Command` in argument and result positions instead of structural command shapes. Inside a generic combinator the Message is an open type parameter, so `Command<Message>` stayed a deferred conditional that never unified with the structural shapes. A parent lifting a child Submodel's Commands, generic over the Message types, can now annotate arguments and returns as `Command.Command<Message>` directly:

```ts
const liftCommands = <ChildMessage, ParentMessage>(
  commands: ReadonlyArray<Command.Command<ChildMessage>>,
  toParent: (message: ChildMessage) => ParentMessage,
): ReadonlyArray<Command.Command<ParentMessage>> =>
  Command.mapMessages(commands, toParent)
```

Concrete call sites infer exactly as before.
