![npm version](https://img.shields.io/npm/v/foldkit)

# Foldkit

> ⚠️ **Experimental**: Foldkit is in canary release for early adopters and experimenters. APIs are incomplete and may change rapidly.

**Foldkit** is an [Elm](https://elm-lang.org/)-inspired UI framework powered by [Effect](https://effect.website/).

> Like origami: simple parts become intricate when folded together.

---

## Philosophy

Foldkit applies functional programming principles to UI development:

- **Pure updates** — State transitions are deterministic functions: `(model: Model, message: Message): Model` is the only way to change state.
- **Controlled side effects** — Side effects are described as `Command<Message>` values and executed by the runtime, not performed directly in update functions.
- **Explicit state transitions** — Every state change is modeled as a specific message type and is captured in the update function.

---

## Installation

The best way to get started with Foldkit is to use `create-foldkit-app`. This
will guide you through creating a new Foldkit project with your preferred
package manager and example template.

```bash
npx create-foldkit-app@latest --wizard
```

---

## Examples

- **[Counter](examples/counter/src/main.ts)** - Simple increment/decrement with reset
- **[Stopwatch](examples/stopwatch/src/main.ts)** - Timer with start/stop/reset functionality
- **[Weather](examples/weather/src/main.ts)** - HTTP requests with async state handling
- **[Todo](examples/todo/src/main.ts)** - CRUD operations with localStorage persistence
- **[Form](examples/form/src/main.ts)** - Form validation with async email checking
- **[Routing](examples/routing/src/main.ts)** - URL routing with parser combinators and route parameters
- **[Shopping Cart](examples/shopping-cart/src/main.ts)** - Complex state management with nested models
- **[Snake](examples/snake/src/main.ts)** - Classic game with built with command streams
- **[WebSocket Chat](examples/websocket-chat/src/main.ts)** - WebSocket integration

### Simple Counter Example

See the full example at [examples/counter/src/main.ts](examples/counter/src/main.ts)

```ts
import { Match as M, Schema } from 'effect'
import { Runtime } from 'foldkit'
import { Class, Html, OnClick, button, div } from 'foldkit/html'
import { ts } from 'foldkit/schema'

// MODEL

const Model = Schema.Number
type Model = typeof Model.Type

// MESSAGE

const Decrement = ts('Decrement')
const Increment = ts('Increment')
const Reset = ts('Reset')

const Message = Schema.Union(Decrement, Increment, Reset)

type Decrement = typeof Decrement.Type
type Increment = typeof Increment.Type
type Reset = typeof Reset.Type

type Message = typeof Message.Type

// UPDATE

const update = (count: Model, message: Message): [Model, Runtime.Command<Message>[]] =>
  M.value(message).pipe(
    M.withReturnType<[Model, Runtime.Command<Message>[]]>(),
    M.tagsExhaustive({
      Decrement: () => [count - 1, []],
      Increment: () => [count + 1, []],
      Reset: () => [0, []],
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [0, []]

// VIEW

const view = (count: Model): Html =>
  div(
    [Class('min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6')],
    [
      div([Class('text-6xl font-bold text-gray-800')], [count.toString()]),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          button([OnClick(Decrement.make()), Class(buttonStyle)], ['-']),
          button([OnClick(Reset.make()), Class(buttonStyle)], ['Reset']),
          button([OnClick(Increment.make()), Class(buttonStyle)], ['+']),
        ],
      ),
    ],
  )

// STYLE

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
```

---

## Development

Explore the examples locally:

```bash
git clone https://github.com/devinjameson/foldkit.git
cd foldkit
pnpm install

# In one terminal - build Foldkit in watch mode
pnpm dev:core

# In another terminal - run the counter example
pnpm dev:example:counter
```

---

## Status

We're building in the open. Feedback, issues, and contributions are welcome.

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
