---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': patch
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': patch
---

Update, init, boot, and component helpers now return records instead of tuples. Every producer and consumer of those results must migrate. The Runtime no longer accepts the tuple form. The `Update.Return<Model, Message>` and `Update.ReturnWithOutMessage<Model, Message, OutMessage>` names stay the same; the values assigned to them change shape.

## Upgrade order

If your application uses Foldkit 0.148.x or earlier, upgrade to 0.149.0 and complete the Message union migration first. The examples below assume Messages use `defineMessageUnion` and updates use `Message.match`.

## Migrate producers

Change each update branch from `[model, commands]` to `{ model, commands }`. Omit `commands` when the branch creates none.

Before:

```typescript
type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedSave: () => [model, [SaveNote()]],
    SucceededSave: ({ note }) => [evo(model, { note: () => note }), []],
  })
```

After:

```typescript
export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedSave: () => ({ model, commands: [SaveNote()] }),
    SucceededSave: ({ note }) => ({
      model: evo(model, { note: () => note }),
    }),
  })
```

An `UpdateReturn` alias still works. Foldkit's authoring convention is to inline the return type when `Message.match` is its only use. Keep the alias when another matcher, helper, or exported signature reuses it. The match generic constrains the whole update, so do not repeat `: UpdateReturn` on the function.

When a producer computes a Commands collection, return it directly even if the collection may be empty:

```typescript
return { model: nextModel, commands: buildCommands(model) }
```

Do not inspect a computed collection only to omit the property when it is empty. Use `commands ?? []` only where another operation requires an array for spreading, concatenating, execution, or an assertion. The new `foldkit/no-empty-commands-array` rule rejects a literal `commands: []` property.

## Migrate consumers

Keep the whole result attached to the operation that produced it. For example, a test should keep the result of submitting a form together:

Before:

```typescript
const [nextModel, commands] = update(model, Message.SubmittedForm())

expect(nextModel.status).toBe('Submitting')
expect(commands).toHaveLength(1)
```

After:

```typescript
const formSubmit = update(model, Message.SubmittedForm())

expect(formSubmit.model.status).toBe('Submitting')
expect(formSubmit.commands ?? []).toHaveLength(1)
```

Do not replace tuple destructuring with record destructuring such as `const { model: nextModel, commands } = update(...)`. Dot access does not force a caller to read `outMessage`, but it keeps the operation and every returned field visibly connected. When the operation name collides with the function, use a trailing underscore such as `init_`.

The same convention applies when assembling independent init results.

Before:

```typescript
const [homeModel, homeCommands] = Home.init()

return [
  { home: homeModel },
  Command.mapMessages(homeCommands, message =>
    Message.GotHomeMessage({ message }),
  ),
]
```

After:

```typescript
const homeInit = Home.init()

return {
  model: { home: homeInit.model },
  commands: Command.mapMessages(homeInit.commands, message =>
    Message.GotHomeMessage({ message }),
  ),
}
```

`Command.mapMessages` accepts an optional Commands field in both call forms and returns an empty array when the field is absent. Pass `homeInit.commands` directly instead of writing `homeInit.commands ?? []`.

## Migrate OutMessages

`Update.ReturnWithOutMessage<Model, Message, OutMessage>` now carries an optional `outMessage` field instead of an `Option<OutMessage>` tuple element. Include `outMessage` when the update emits one and omit the field otherwise.

Before:

```typescript
SucceededAuthenticate: ({ session }) => [
  model,
  [],
  Option.some(OutMessage.SucceededLogin({ session })),
],
FailedAuthenticate: () => [model, [], Option.none()],
```

After:

```typescript
SucceededAuthenticate: ({ session }) => ({
  model,
  outMessage: OutMessage.SucceededLogin({ session }),
}),
FailedAuthenticate: () => ({ model }),
```

Use `Update.Return<Model, Message>` when an update cannot emit an OutMessage. TypeScript rejects assigning a result that may contain an OutMessage to that type, so a caller cannot keep the Model and Commands while losing the OutMessage:

```typescript
const childUpdate: Update.ReturnWithOutMessage<
  Child.Model,
  Child.Message,
  Child.OutMessage
> = Child.update(model.child, message)

// Type error: childUpdate may contain an OutMessage.
const parentUpdate: Update.Return<Model, Message> = childUpdate
```

An OutMessage-aware API can still accept a plain result. A missing `outMessage` field means that update emitted nothing:

```typescript
const plainUpdate: Update.Return<Model, Message> = { model }

const submodelUpdate: Update.ReturnWithOutMessage<Model, Message, OutMessage> =
  plainUpdate
```

When an operation has already produced a plain result and another operation decides whether to attach an OutMessage, use `Update.withOutMessage`. It preserves the existing Model and Commands, omits the property for `undefined`, and rejects a result that could already contain an OutMessage.

```typescript
return pipe(dialogClose, Update.withOutMessage(outMessage))
```

The data-first form, `Update.withOutMessage(dialogClose, outMessage)`, is also available.

When constructing a new result with a known OutMessage, include it directly:

```typescript
return { model, outMessage: OutMessage.ClearedDate() }
```

A child fold's `toParentOutMessage` mapper now returns the parent OutMessage directly. Return `undefined` for each named child variant that stops at the current Submodel.

Before:

```typescript
const toParentOutMessage = M.type<Child.OutMessage>().pipe(
  M.withReturnType<Option.Option<OutMessage>>(),
  M.tagsExhaustive({
    Submitted: ({ id }) => Option.some(OutMessage.Submitted({ id })),
    Cancelled: () => Option.none(),
  }),
)
```

After:

```typescript
const toParentOutMessage = M.type<Child.OutMessage>().pipe(
  M.withReturnType<OutMessage | undefined>(),
  M.tagsExhaustive({
    Submitted: ({ id }) => OutMessage.Submitted({ id }),
    Cancelled: () => undefined,
  }),
)
```

Add `toParentOutMessage` only when at least one child OutMessage is forwarded from the current Submodel to its parent. Omit it when `foldOutMessage` handles every variant locally. `Update.foldChildStep` supports the same forwarding for child entry points that take only the child Model.

## Migrate composed operations

Do not translate manual child tuple unpacking into separate reads of `result.model`, `result.commands`, and `result.outMessage`. Use `Update.foldChild` for child Messages and `Update.foldChildStep` for child entry points that take only the child Model.

The old code below writes the next Dialog Model and maps its Commands. The two-slot destructure silently drops the Dialog OutMessage:

Before:

```typescript
const [nextDialog, dialogCommands] = Dialog.close(model.dialog)

return [
  evo(model, {
    dialog: () => nextDialog,
    isSubmitting: () => false,
  }),
  Command.mapMessages(dialogCommands, toGotDialogMessage),
]
```

The replacement intentionally does more than translate the return shape. It handles the Dialog OutMessage that the old code discarded.

After:

```typescript
const foldDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: model => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: toGotDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})

return Update.combine(model, [
  foldDialogClose,
  stepModel => ({
    model: evo(stepModel, { isSubmitting: () => false }),
  }),
])
```

Use `Update.combine` for two or more operations that update the same Model in sequence. Name an inline Step parameter `stepModel`; it contains the Model produced by the preceding Step. Call a single operation directly. Independent child inits do not form a sequence, so initialize them separately and assemble their Models into the parent.

Foldkit UI component helpers, the DevTools overlay, the SSR fixtures, and generated `create-foldkit-app` templates now use the same record shape. The [Update guide](https://foldkit.dev/core/update) and [Submodels guide](https://foldkit.dev/core/submodel) cover the permanent authoring conventions in more depth.
