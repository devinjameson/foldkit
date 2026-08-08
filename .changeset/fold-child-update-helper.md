---
'foldkit': minor
---

Add `Update.foldChild`, the update half of embedding a child Submodel. It takes the facts that vary per child (the child `update`, an `Option`-returning `read`, `write`, `toParentMessage`, and `foldOutMessage` for children that emit OutMessages) and returns a dual `Update.Fold`: call it data-first in a handler (`foldSearch(model, message)`) or data-last to build an `Update.Step` that composes with `Update.combine` (`foldSearch(message)`). When `read` returns `None` the fold is a no-op, so a Message for an unmounted child does nothing. A parent that is itself a Submodel adds `toParentOutMessage` to lift the child's OutMessage into its own; that fold returns `Update.ReturnWithOutMessage`, carrying the parent's OutMessage channel.

Existing hand-rolled `Got*` handlers keep working unchanged. To adopt, a handler like this:

```ts
GotSettingsMessage: ({ message }) => {
  const [nextSettings, commands] = Settings.update(model.settings, message)
  return [
    evo(model, { settings: () => nextSettings }),
    Command.mapMessages(commands, message => GotSettingsMessage({ message })),
  ]
},
```

becomes a module-scope fold and a one-line handler:

```ts
const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => GotSettingsMessage({ message }),
})

GotSettingsMessage: ({ message }) => foldSettings(model, message),
```

See the [Submodel docs](https://foldkit.dev/core/submodel#fold-child) for OutMessage folding and the call-site conventions.
