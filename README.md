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

## Examples

Current examples:
- **[Counter](examples/counter/src/main.ts)** - Simple increment/decrement with reset
- **[Stopwatch](examples/stopwatch/src/main.ts)** - Timer with start/stop/reset functionality
- **[Weather](examples/weather/src/main.ts)** - HTTP requests with async state handling

### Coming Next

1. **Todo List** - CRUD operations with localStorage persistence
1. **Form with Validation** - Multiple input types with client-side validation
1. **Multi-page App** - URL routing with navigation and route parameters
1. **Data Table** - API-driven table with sorting, filtering, and pagination

### Simple Counter Example

See the full example at [examples/counter/src/main.ts](examples/counter/src/main.ts)

```ts
import { Data, Effect } from 'effect'
import { Class, Html, OnClick, button, div, fold, makeApp, updateConstructors } from '@foldkit/core'

// MODEL

type Model = number

const init: Model = 0

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

const app = makeApp({
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
- [ ] Router integration
- [ ] Devtools + tracing

---

## License

MIT
