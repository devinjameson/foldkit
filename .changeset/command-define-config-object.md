---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/oxlint-plugin': minor
---

Take every `Command.define` input as a named field, and fold interruption into it.

`Command.define` took its inputs positionally, with the result Messages as a variadic tail and the Effect supplied by a second call. That signature had no room to grow: a rest parameter has no trailing slot, so the one Command modifier that exists, interruption, had to live in its own namespace as `Command.Interruptible.define`. Namespaces do not compose. A second modifier would have had nowhere to go, and the positional `toKey` in the interruptible form was the only argument whose meaning a reader could not recover from its shape.

Inputs are now named fields on a config object: `args` declares the args Schema, `messages` lists the Messages the Command can produce, `execute` holds the Effect, and `interrupt` opts into interruption. `Command.Interruptible.define` is removed; `Command.Interruptible` remains for the outcome vocabulary (`Outcome`, `Interrupted`, `NotFound`), which update functions still match on.

`interrupt: true` keys every invocation by the Command name, which is what a single-instance flow wants. `interrupt: { keyFields, toKey }` derives the key part from selected args so concurrent invocations can be interrupted independently. `keyFields` gives `toKey` its parameter type and declares the exact args the `Interrupt` constructor requires, so the annotation the positional form required is no longer needed.

## Migration

Move each positional argument to its field, wrap the result Messages in an array, and move the Effect from the second call into `execute`.

```ts
// before
const FetchWeather = Command.define(
  'FetchWeather',
  { zipCode: S.String },
  SucceededFetchWeather,
  FailedFetchWeather,
)(({ zipCode }) => Effect.gen(function* () { ... }))

// after
const FetchWeather = Command.define('FetchWeather', {
  args: { zipCode: S.String },
  messages: [SucceededFetchWeather, FailedFetchWeather],
  execute: ({ zipCode }) => Effect.gen(function* () { ... }),
})
```

A Command with no args omits `args` and gives `execute` a bare Effect.

```ts
// before
const LockScroll = Command.define('LockScroll', CompletedLockScroll)(
  Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
)

// after
const LockScroll = Command.define('LockScroll', {
  messages: [CompletedLockScroll],
  execute: Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
})
```

Interruptible Commands move to `Command.define` with an `interrupt` field. The `Interrupt` constructor and its outcome Message are unchanged.

```ts
// before
const UploadFile = Command.Interruptible.define(
  'UploadFile',
  { uploadId: S.Number, file: S.instanceOf(File) },
  ({ uploadId }: UploadKey) => String(uploadId),
  SucceededUploadFile,
  FailedUploadFile,
)(({ uploadId, file }) => Effect.gen(function* () { ... }))

// after
const UploadFile = Command.define('UploadFile', {
  args: { uploadId: S.Number, file: S.instanceOf(File) },
  messages: [SucceededUploadFile, FailedUploadFile],
  interrupt: {
    keyFields: ['uploadId'],
    toKey: ({ uploadId }) => String(uploadId),
  },
  execute: ({ uploadId, file }) => Effect.gen(function* () { ... }),
})
```

An interruptible Command that omits `toKey` becomes `interrupt: true`.

One edge to know about: `interrupt` is discriminated by the literal `true`, so hoisting the config into a variable without `as const` widens it to `boolean` and fails to compile. The error names the widening directly, and writing the config inline at the definition site, which is the normal form, is unaffected.
