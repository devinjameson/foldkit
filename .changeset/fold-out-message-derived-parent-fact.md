---
'foldkit': minor
---

`Update.foldChild` and `Update.foldChildStep` can now emit a derived parent OutMessage from `foldOutMessage`. Type the fold as `Update.StepWithOutMessage` when handling the child fact may also produce a different fact from the parent.

Imagine this code lives inside a settings page module with a reusable `Select` Submodel. Choosing "Dark" makes the Select emit `Select.OutMessage.Selected`. The settings page owns the theme Model, so its local `changeTheme` Step applies the selection:

```typescript
// settings/main.ts
const changeTheme =
  (theme: Theme): Update.StepWithOutMessage<Model, Message, OutMessage> =>
  model => ({
    model: evo(model, { theme: () => theme }),
    commands: [SaveThemePreference({ theme })],
    outMessage: OutMessage.ChangedTheme({ theme }),
  })
```

`changeTheme` evolves the settings Model, returns the Command that saves the preference, and reports the change to the settings page's parent.

Before, `foldOutMessage` could only return a plain `Update.Step`, so it could not call `changeTheme`. The fold had to leave the selection for the parent Message handler:

Before:

```typescript
// settings/main.ts
const foldThemeSelectOutMessage = M.type<Select.OutMessage<Theme>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected: () => model => ({ model }),
  }),
)
```

The `GotThemeSelectMessage` branch then had to run the child fold, inspect the child Message again, call `changeTheme`, combine both Commands collections, and preserve the optional parent OutMessage:

```typescript
// settings/main.ts
GotThemeSelectMessage: ({ message }) => {
  const themeSelectFold = foldThemeSelect(model, message)

  return Select.Message.match<
    Update.ReturnWithOutMessage<Model, Message, OutMessage>
  >(message, {
    SelectedOption: ({ option }) => {
      const themeChange = changeTheme(option)(themeSelectFold.model)

      return {
        ...themeChange,
        commands: [
          ...(themeSelectFold.commands ?? []),
          ...(themeChange.commands ?? []),
        ],
      }
    },
  })
},
```

After:

```typescript
// settings/main.ts
const foldThemeSelectOutMessage = M.type<Select.OutMessage<Theme>>().pipe(
  M.withReturnType<Update.StepWithOutMessage<Model, Message, OutMessage>>(),
  M.tagsExhaustive({
    Selected: ({ value: theme }) => changeTheme(theme),
  }),
)
```

Set `foldOutMessage` to `foldThemeSelectOutMessage` in the existing `Update.foldChild` config. The `GotThemeSelectMessage` branch only routes the child Message now:

```typescript
// settings/main.ts
const foldThemeSelect = Update.foldChild({
  update: Select.update,
  read: model => Option.some(model.themeSelect),
  write: (model, nextThemeSelect) =>
    evo(model, { themeSelect: () => nextThemeSelect }),
  toParentMessage: message => Message.GotThemeSelectMessage({ message }),
  foldOutMessage: foldThemeSelectOutMessage,
})

GotThemeSelectMessage: ({ message }) => foldThemeSelect(model, message),
```

The Step returned by `changeTheme` now runs inside `foldThemeSelect`. `Update.foldChild` preserves the Select Commands and returns the settings page's next Model, save Command, and derived `ChangedTheme` OutMessage together.

Keep `toParentOutMessage` for one-to-one forwarding of a child fact. No adapter is needed when every parent OutMessage is derived by `foldOutMessage`. When both paths emit, the derived OutMessage replaces the lift for that dispatch. If the Step emits nothing, the lift still runs.
