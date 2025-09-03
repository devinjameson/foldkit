# Foldkit

**Foldkit** is a lightweight framework for building functional UIs in TypeScript powered by [Effect](https://effect.website/).

It draws inspiration from Elm, React, and functional architecture principles — enabling clear state transitions, precise side effects, and predictable UI.

> Like origami: simple parts become intricate when folded together.

---

## Philosophy

Foldkit applies functional programming principles to UI development:

- **Pure update functions** — State transitions are deterministic functions: `(model: Model, message: Message): Model` is the only way to change state.
- **Controlled side effects** — Side effects are described as `Command<Message>` values and executed by the runtime, not performed directly in update functions.
- **Explicit state transitions** — Every state change is modeled as a specific message type. Every state change is captured in the update function.

---

## Examples

Current examples:

- **[Counter](examples/counter/src/main.ts)** - Simple increment/decrement with reset
- **[Stopwatch](examples/stopwatch/src/main.ts)** - Timer with start/stop/reset functionality
- **[Weather](examples/weather/src/main.ts)** - HTTP requests with async state handling
- **[Todo](examples/todo/src/main.ts)** - CRUD operations with localStorage persistence
- **[Form](examples/form/src/main.ts)** - Form validation with async email checking
- **[Routing](examples/routing/src/main.ts)** - URL routing with parser combinators and route parameters

### Coming Next

1. **Data Table** - API-driven table with sorting, filtering, and pagination

### Simple Counter Example

See the full example at [examples/counter/src/main.ts](examples/counter/src/main.ts)

```ts
import { Data, Effect, Option } from 'effect'

import { fold, makeElement, updateConstructors, ElementInit } from '@foldkit'
import { Class, Html, OnClick, button, div } from '@foldkit/html'

// MODEL

type Model = number

// UPDATE

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  Reset: {}
}>
const Message = Data.taggedEnum<Message>()

const { pure } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  Decrement: pure((count) => count - 1),
  Increment: pure((count) => count + 1),
  Reset: pure(() => 0),
})

// INIT

const init: ElementInit<Model, Message> = () => [0, Option.none()]

// VIEW

const view = (count: Model): Html =>
  div(
    [Class('min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6')],
    [
      div([Class('text-6xl font-bold text-gray-800')], [count.toString()]),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          button([OnClick(Message.Decrement()), Class(buttonStyle)], ['-']),
          button([OnClick(Message.Reset()), Class(buttonStyle)], ['Reset']),
          button([OnClick(Message.Increment()), Class(buttonStyle)], ['+']),
        ],
      ),
    ],
  )

// STYLE

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

// RUN

const app = makeElement({
  init,
  update,
  view,
  container: document.body,
})

Effect.runFork(app)
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
- [x] Optimized DOM rendering (minimal diffs, efficient updates)
- [x] Router integration
- [ ] Devtools + tracing

---

## License

MIT
