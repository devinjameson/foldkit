---
'foldkit': minor
---

`Update.foldChild`'s `foldOutMessage` now receives an optional second parameter, an `Update.FoldContext` carrying `liftCommand` and `liftCommands` bound to the config's `toParentMessage`. The fold already lifts the Commands the child's update returns. The context covers the other case: a Command the parent returns on the child's behalf from the OutMessage Step, built with context only the parent holds, whose result Message is still the child's. The lifters apply the same lift the fold gives the child's own Commands, so there is no `Command.mapMessage` call to write and no second copy of the wrapper to keep in sync.

Existing one-parameter `foldOutMessage` functions keep working unchanged.

In the example below, the magic link carries a redirect destination, and only the parent knows the current Route. The Login child cannot build `Login.SendMagicLink` itself, so it emits `RequestedMagicLink` as a fact and the parent returns the Command with the Route filled in.

Before:

```ts
const foldLoginOutMessage = M.type<Login.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    RequestedMagicLink:
      ({ email }) =>
      model => [
        model,
        [
          Command.mapMessage(
            Login.SendMagicLink({ email, redirectRoute: model.route }),
            message => GotLoginMessage({ message }),
          ),
        ],
      ],
  }),
)
```

After:

```ts
const foldLoginOutMessage: (
  outMessage: Login.OutMessage,
  context: Update.FoldContext<Login.Message, Message>,
) => Update.Step<Model, Message> = (outMessage, { liftCommand }) =>
  M.value(outMessage).pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      RequestedMagicLink:
        ({ email }) =>
        model => [
          model,
          [
            liftCommand(
              Login.SendMagicLink({ email, redirectRoute: model.route }),
            ),
          ],
        ],
    }),
  )
```
