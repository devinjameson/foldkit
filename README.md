# Foldkit

**Foldkit** is a composable toolkit for building structured user interfaces with [Effect](https://effect.website/) and TypeScript.

It draws inspiration from Elm, React, and functional architecture principles — enabling clear state transitions, precise side effects, and predictable UI.

> Like origami: simple parts become intricate when folded together.

---

## Philosophy

Apps built with Foldkit unfold through messages — each one folded into state, predictably and purely.

- **Model first** — State is explicit, local, and testable.
- **Precise effects** — Side effects are described, not performed, using [Effect](https://effect.website/).
- **Composability > configuration** — Everything is just a value.

---

## Example

See the full example at [examples/counter/src/main.ts](https://github.com/devinjameson/foldkit/blob/main/examples/counter/src/main.ts).

```ts
import { Console, Data, Duration, Effect } from 'effect'
import {
  button,
  Command,
  div,
  OnClick,
  runApp,
  text,
  match,
  pure,
  effect,
  pureEffect,
  Class,
  Html,
} from '@foldkit/core'

//
// MODEL
//

type Model = {
  count: number
}

const init: Model = {
  count: 0,
}

//
// UPDATE
//

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  IncrementLater: {}
  SetCount: SetCountPayload
  LogAndSetCount: LogAndSetCountPayload
  SaveCount: {}
  SaveSuccess: SaveSuccessPayload
  None: {}
}>
const Message = Data.taggedEnum<Message>()

type SetCountPayload = { count: number }
type LogAndSetCountPayload = { count: number; id: string }
type SaveSuccessPayload = { savedCount: number }

const update = match<Model, Message>({
  Decrement: ({ count }) => pure({ count: count - 1 }),
  Increment: ({ count }) => pure({ count: count + 1 }),
  IncrementLater: effect(() => incrementLater('1 second')),

  SetCount: (_, { count }) => pure({ count }),
  LogAndSetCount: (_, { count, id }) => pureEffect({ count }, () => logCount({ count, id })),

  SaveCount: ({ count }) => pureEffect({ count }, () => saveToServer(count)),
  SaveSuccess: (_, { savedCount }) =>
    pureEffect({ count: savedCount }, () => logSaveSuccess(savedCount)),

  None: pure,
})

//
// COMMAND
//

const incrementLater = (duration: Duration.DurationInput): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log('Hold, please!')
    yield* Effect.sleep(duration)
    return Message.Increment()
  })

const logCount = ({ count, id }: { count: number; id: string }): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`${id}-${count}`)
    return Message.None()
  })

const saveToServer = (count: number): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`Saving count...`)
    yield* Effect.sleep('2 seconds')
    return Message.SaveSuccess({ savedCount: count })
  })

const logSaveSuccess = (savedCount: number): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`Saved ${savedCount}`)
    return Message.None()
  })

//
// VIEW
//

const view = (model: Model): Html =>
  div(
    [Class(pageStyle)],
    [
      div([Class(countStyle)], [text(String(model.count))]),
      div(
        [Class(buttonRowStyle)],
        [
          button([OnClick(Message.Decrement()), Class(buttonStyle)], ['-']),
          button([OnClick(Message.SetCount({ count: 0 })), Class(buttonStyle)], ['Reset']),
          button([OnClick(Message.SaveCount()), Class(buttonStyle)], ['Save']),
          button([OnClick(Message.IncrementLater()), Class(buttonStyle)], ['+ in 1s']),
          button([OnClick(Message.Increment()), Class(buttonStyle)], ['+']),
        ],
      ),
    ],
  )

//
// RUN
//

runApp<Model, Message>({
  init,
  update,
  view,
  container: document.body,
})
```

---

## Status

> ⚠️ Foldkit is in active development.  
> Expect rapid iteration and breaking changes.

We’re building in the open — feedback, issues, and contributions are welcome.

---

## Getting Started

Foldkit hasn’t been published to npm yet, but you can clone the repo and start exploring:

```bash
git clone https://github.com/devinjameson/foldkit.git
cd foldkit
```

Once published, you'll be able to install it with:

```bash
pnpm install @foldkit/core
```

---

## Roadmap

- [x] Core program loop with ADT-based update
- [x] DOM rendering
- [ ] Optimized DOM rendering (minimal diffs, efficient updates)
- [ ] Router integration
- [ ] Devtools + tracing

---

## License

MIT
