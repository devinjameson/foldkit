# Update

## One Function Defines Every Transition {#overview}

The update function receives the current Model and a Message, then returns the next Model and any Commands for the runtime to execute. It is the only place application state changes.

Update is pure. Given the same Model and Message, it returns the same result. It does not mutate state, call browser APIs, start timers, or make requests. That makes a transition direct to test: pass in the inputs and assert on the returned values.

Use `Message.match` to handle the Message union. If you add a Message and omit its branch, TypeScript reports the missing case. No `default` branch silently absorbs a new variant.

Use [Effect's `Match`](https://effect.website/docs/code-style/pattern-matching/) for other tagged unions, partial matches, fallbacks, and one handler shared across several tags.

::Snippet{name="counterUpdate" label="update example"}

Each branch describes one transition. `ClickedDecrement` and `ClickedIncrement` transform the current count. `ClickedReset` replaces it with zero. This version of the counter has no side effects, so all three omit `commands`.

The branches build their next Model with [evo](/best-practices/immutability#immutable-updates). Each named field receives a function from its current value to its next value. Omitted fields keep their existing values and references, so the same update style continues to work as the Model grows.

Update returns a record containing the next Model and, when needed, an array of Commands. A Command describes one side effect, such as an HTTP request, timer, or browser API call. The [Commands](/core/commands) page adds a delayed reset and puts the optional `commands` field to work.

## Returning Commands

An update, init, boot, or component helper that statically creates no Commands omits `commands`. When it computes a Commands collection, it returns that collection directly without checking whether it is empty. The [`foldkit/no-empty-commands-array`](/tooling/oxlint-plugin#no-empty-commands-array) lint rule rejects only a literal `commands: []` property.

## Composing Results

Keep an update-like result attached to the operation that produced it. Name the value after the operation and use dot access:

```ts
const homeInit = Home.init()

return {
  model: { home: homeInit.model },
  commands: Command.mapMessages(homeInit.commands, message =>
    Message.GotHomeMessage({ message }),
  ),
}
```

The same rule applies when a test consumes an update result:

```ts
const formSubmit = update(model, Message.SubmittedForm())

expect(formSubmit.model.status).toBe('Submitting')
expect(formSubmit.commands ?? []).toHaveLength(1)
```

When the operation name collides with the function, use a trailing underscore such as `init_`. Do not destructure or rename `model`, `commands`, or `outMessage`. Dot access does not make an OutMessage impossible to ignore. It keeps the operation and its returned values visibly connected.

Pass optional Commands directly to APIs that accept them, including `Command.mapMessages`. Use `result.commands ?? []` only when the next operation requires an array for spreading, concatenating, execution, or an assertion.

Manual unpacking of a child result usually means the site should use `Update.foldChild` or `Update.foldChildStep`.

Use `Update.combine` when two or more operations update the same Model in sequence. It passes each Step the Model produced by the preceding Step. Name that parameter `stepModel` when an inline Step needs it:

```ts
return Update.combine(model, [
  foldDialog(Message.RequestedClose()),
  stepModel => ({
    model: evo(stepModel, { isSubmitting: () => false }),
  }),
])
```

`combine` appends the Commands to its returned array in Step order. The runtime forks those Commands independently, so an application must not depend on their execution or completion order.

Call a single operation directly. Independent child inits are also not a sequence because neither child updates the other child's Model. Initialize them separately and assemble the parent Model:

```ts
const homeInit = Home.init()
const roomInit = Room.init(route)

return {
  model: {
    home: homeInit.model,
    room: roomInit.model,
  },
  commands: [
    ...Command.mapMessages(homeInit.commands, toGotHomeMessage),
    ...Command.mapMessages(roomInit.commands, toGotRoomMessage),
  ],
}
```

## Preventing Lost OutMessages

Use `Update.Return<Model, Message>` for an update that cannot emit an OutMessage. TypeScript rejects assigning an OutMessage-producing result to it:

```ts
const childUpdate: Update.ReturnWithOutMessage<
  Child.Model,
  Child.Message,
  Child.OutMessage
> = Child.update(model.child, message)

// Type error: childUpdate may contain an OutMessage that this type cannot hold.
const parentUpdate: Update.Return<Model, Message> = childUpdate
```

This protects the OutMessage from being lost while a caller keeps only the Model and Commands.

An OutMessage-aware return type also accepts a result that emitted nothing:

```ts
const plainUpdate: Update.Return<Model, Message> = { model }

const submodelUpdate: Update.ReturnWithOutMessage<Model, Message, OutMessage> =
  plainUpdate
```

An OutMessage-aware caller can accept a plain result because an update is allowed to emit nothing.

When an operation has already produced a plain result and another operation decides whether to attach an OutMessage, use `Update.withOutMessage`:

```ts
const dialogClose = closeDialog(model)

return pipe(dialogClose, Update.withOutMessage(outMessage))
```

The object-spread alternative is easy to get wrong:

```ts
// Avoid: this writes outMessage: undefined and accepts a result that already has an OutMessage.
return { ...dialogClose, outMessage }
```

`Update.withOutMessage` preserves `dialogClose.model` and `dialogClose.commands`. A defined value becomes `outMessage`; `undefined` leaves the property out. The update result must be a plain return, so the helper cannot overwrite an OutMessage another operation emitted.

When constructing a new result with a known OutMessage, include it directly:

```ts
return { model, outMessage: OutMessage.Closed() }
```

First, the [view function](/core/view) completes the basic loop by turning the Model into what the user sees.
