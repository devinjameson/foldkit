# @foldkit/oxlint-plugin

## 0.8.0

### Minor Changes

- 11e0b0e: Update, init, boot, and component helpers now return records instead of tuples. Every producer and consumer of those results must migrate. The Runtime no longer accepts the tuple form. The `Update.Return<Model, Message>` and `Update.ReturnWithOutMessage<Model, Message, OutMessage>` names stay the same; the values assigned to them change shape.

  ## Upgrade order

  If your application uses Foldkit 0.148.x or earlier, upgrade to 0.149.0 and complete the Message union migration first. The examples below assume Messages use `defineMessageUnion` and updates use `Message.match`.

  ## Migrate producers

  Change every two-element tuple returned by update, init, boot, or a component helper from `[model, commands]` to `{ model, commands }`. Apply the change to every branch of an update. Omit `commands` wherever the producer statically creates none.

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

  TypeScript rejects this manual composition when the enclosing update returns `Update.Return<Model, Message>`:

  ```typescript
  const dialogOpen = openDialog(model)

  return {
    model: evo(dialogOpen.model, { isSubmitting: () => false }),
    // Type error: with exactOptionalPropertyTypes, this property must be
    // omitted when dialogOpen.commands is undefined.
    commands: dialogOpen.commands,
  }
  ```

  Every Foldkit template enables `exactOptionalPropertyTypes`. With that setting, the optional `commands` property may be absent. When the property is present, it must contain Commands. `dialogOpen.commands` has the type `Update.Commands<Message> | undefined`, so TypeScript rejects `commands: dialogOpen.commands`.

  This error often points to update results being composed by hand. When a later operation needs the Model produced by an earlier operation, express both as Steps and compose them with `Update.combine`:

  ```typescript
  return Update.combine(model, [
    openDialog,
    stepModel => ({
      model: evo(stepModel, { isSubmitting: () => false }),
    }),
  ])
  ```

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
  const plainChildUpdate: Update.Return<Child.Model, Child.Message> =
    childUpdate
  ```

  An OutMessage-aware API can still accept a plain result. A missing `outMessage` field means that update emitted nothing:

  ```typescript
  const plainUpdate: Update.Return<Model, Message> = { model }

  const submodelUpdate: Update.ReturnWithOutMessage<
    Model,
    Message,
    OutMessage
  > = plainUpdate
  ```

  When an update definitely emits an OutMessage, include it directly:

  ```typescript
  return { model, outMessage: OutMessage.ClearedDate() }
  ```

  When the OutMessage may be `undefined`, use `Update.withOutMessage`. It omits the property when the update emitted nothing and preserves the Model and Commands of an existing result:

  ```typescript
  return pipe(dialogClose, Update.withOutMessage(outMessage))
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

  Add `toParentOutMessage` only when at least one child OutMessage is forwarded from the current Submodel to its parent. Omit it when no variant is forwarded. A forwarded variant may still be handled locally by `foldOutMessage`. `Update.foldChildStep` supports the same forwarding for child entry points that take only the child Model.

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

  Use `Update.combine` for two or more Steps when a later Step needs the Model produced by an earlier Step. It collects Commands in Step order, but the Runtime forks them independently after update returns. Name an inline Step parameter `stepModel`; it contains the Model produced by the preceding Step. Call a single operation directly. Independent child inits do not form a sequence, so initialize them separately and assemble their Models into the parent.

  Foldkit UI component helpers, the DevTools overlay, the SSR fixtures, and generated `create-foldkit-app` templates now use the same record shape. The [Update guide](https://foldkit.dev/core/update) and [Submodels guide](https://foldkit.dev/core/submodel) cover the permanent authoring conventions in more depth.

## 0.7.0

### Minor Changes

- 504344b: Replace `m` with `defineMessageUnion` in `foldkit/message`. `defineMessageUnion` declares a whole Message union from one record of fields per variant instead of naming each variant once as a constructor and again in the union list.

  The result is a Schema, so it decodes and nests in a Model. Its focused Message surface is exhaustive `match` plus one callable constructor per variant. Each constructor is itself a schema, which is what `Command.define` needs for its `messages` list. Use `Message.match` for exhaustive dispatch. Effect `Match` remains available for partial matching, fallbacks, and one handler shared across several tags.

  This removes the `m` export. Declare Message and OutMessage as separate `defineMessageUnion()` unions, even when two variants happen to carry the same fields. Constructors stay on their owning union namespace rather than being exported as sibling bindings.

  Update `@foldkit/oxlint-plugin` to recognize `defineMessageUnion()` declarations in the Message naming rules. Remove `message-binding-matches-tag`, since variants no longer have separate constructor bindings whose names can drift from their tags.

  Update `create-foldkit-app` templates to declare and match Messages with the new API.

  ```typescript
  import { Schema as S } from 'effect'
  import { Update } from 'foldkit'
  import { defineMessageUnion } from 'foldkit/message'
  import { evo } from 'foldkit/struct'

  const Model = S.Struct({ count: S.Number })
  type Model = typeof Model.Type

  export const Message = defineMessageUnion({
    ClickedReset: {},
    ChangedCount: { count: S.Number },
  })
  export type Message = typeof Message.Type

  type UpdateReturn = Update.Return<Model, Message>

  export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
      ClickedReset: () => [evo(model, { count: () => 0 }), []],
      ChangedCount: ({ count }) => [evo(model, { count: () => count }), []],
    })
  ```

- e041379: Add `foldkit/no-nonportable-server-globals` to both presets. The rule catches common browser-only globals in `entry.server.ts`, `entry.server.tsx`, TypeScript files under a `server` directory, and `prerender.ts`. Colocated files ending in `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` are excluded.

  The curated list covers `document`, `window`, `navigator`, `localStorage`, `sessionStorage`, `history`, `location`, `alert`, `confirm`, `prompt`, `requestAnimationFrame`, `cancelAnimationFrame`, `requestIdleCallback`, `cancelIdleCallback`, `getComputedStyle`, `matchMedia`, `customElements`, `screen`, `IntersectionObserver`, `ResizeObserver`, and `MutationObserver`. The same names are caught when read through a static `globalThis` property or destructured directly from `globalThis`.

  Local bindings, parameters, and type-only `typeof` queries remain valid. `Request`, `Response`, `Headers`, `fetch`, and `URL` remain available for host code. The Foldkit-owned rule composes with any `no-restricted-globals` policy in the consuming project instead of replacing it.

  This is a portability guardrail, not an exhaustive list of browser APIs or a security boundary. Lint may newly fail when a recognized server file reads one of the listed globals at runtime.

## 0.6.0

### Minor Changes

- 23423bd: Adds `foldkit/no-empty-children-array`, which flags a builder call that passes an inline empty array as children. The argument is optional, so `h.div([h.Class('divider')], [])` should be written `h.div([h.Class('divider')])`, and `h.keyed('li')(key, [attrs], [])` should be written `h.keyed('li')(key, [attrs])`. Calls that pass a variable, a call, a conditional, or a non-empty array are left alone, and so is any method that is not an element builder. An array whose only content is a comment is also left alone, since dropping the argument would delete the comment with it.

  The rule is on at error severity in `recommended`. The fix it asks for needs the `foldkit` release that made children optional, so bump `foldkit` alongside the plugin. On an older `foldkit`, omitting the argument does not compile.

## 0.5.0

### Minor Changes

- 5d77a97: Take every `Command.define` input as a named field, and fold interruption into it.

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

## 0.4.0

### Minor Changes

- a25f769: Ship `recommended.json` and `all.json` preset files so a JSON `.oxlintrc.json` can extend a preset directly instead of hand-copying rule lists: `{ "extends": ["./node_modules/@foldkit/oxlint-plugin/recommended.json"] }`. The files are generated at build time from the same source as `configs.recommended` / `configs.all`, ship in `files`, and are reachable through the `./recommended.json` and `./all.json` export subpaths. Consumers pick up new rules with a version bump instead of a config diff.

  Both presets now scope every foldkit rule off in test files (`**/*.test.ts`, `**/*.test.tsx`) via an `overrides` entry. Foldkit rules police application definitions that tests exercise rather than write, and some invert in tests (a route-parsing test must build the URL the router under test parses; a Command test double is hand-rolled by design). Scoping them off by default keeps the ruleset stable as new rules ship in batches, and a rule that wants test coverage can opt in explicitly.

### Patch Changes

- 8dd1906: Drop `RadioGroup` from the `selection-submodel-factory-at-module-scope` rule. RadioGroup is now a stateless controlled render helper with no `create` factory, so the rule covers Combobox, Listbox, Menu, and Tabs.

## 0.3.0

### Minor Changes

- 2d3e621: Add 16 convention rules, taking the plugin from 8 to 24. Rule designs come from [`@mpsuesser/oxlint-plugin-foldkit`](https://github.com/mpsuesser/oxlint-plugin-foldkit) by Marc Suesser (MIT), curated for Foldkit in #607 by @artile, and reimplemented here from behavior specs in house style.

  - Command shape: `command-define-pascal-const`, `no-hand-rolled-command-struct`
  - Submodel wiring: `wrap-child-output-in-got-message`, `got-wrapper-carries-only-routing`, `no-child-message-construction-in-root`, `selection-submodel-factory-at-module-scope`
  - Model updates: `no-spread-in-evo`
  - View keying and accessibility: `no-array-index-view-keys`, `keyed-required-for-mapped-rows`, `require-rel-for-external-link`, `no-raw-dom-event-attributes`
  - Routing: `no-hardcoded-route-strings`
  - Lifecycle: `mount-factory-must-use-element`, `no-duplicate-onmount-per-element`, `lazy-view-stable-references`
  - Dev config: `no-disabling-dev-guardrails`

  Every rule lives in `src/rules/` with a colocated unit test and a real-oxlint integration fixture. The generated `recommended` preset (every rule at error) and `all` preset now carry the package specifier, so consumers can spread either into their oxlint config and have the plugin resolve. Nothing is enabled in the scaffold preset; adopting any of these stays opt-in per app, so existing projects see no change.

## 0.2.0

### Minor Changes

- 2d23b39: Add `foldkit/no-module-level-mutable-state`, a lint rule that flags module-level `let` and `var` declarations (including `export let`), which hold state outside the Model. Ambient `declare let` declarations are not flagged. Scaffolded projects enable the rule in their generated `.oxlintrc.json`.

  Ported from the purity-boundary rule family in `@mpsuesser/oxlint-plugin-foldkit` by Marc Suesser.

## 0.1.0

### Minor Changes

- 86b2250: Publish the Foldkit oxlint plugin and scaffold new apps with oxlint and the Foldkit-specific lint rules.
