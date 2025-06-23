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

```ts
import { Console, Data, Effect, Option } from 'effect'
import { button, Command, div, OnClick, runApp, text, match } from '@foldkit/core'

type Model = {
  count: number
}

const init: Model = {
  count: 0,
}

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  IncrementLater: {}
}>

const { Decrement, Increment, IncrementLater } = Data.taggedEnum<Message>()

const incrementLater: Command<Message> = Effect.gen(function* () {
  yield* Console.log('Just a sec!')
  yield* Effect.sleep('1 second')
  return Increment()
})

const update = match<Model, Message>({
  Decrement: (model) => [{ count: model.count - 1 }, Option.none()],
  Increment: (model) => [{ count: model.count + 1 }, Option.none()],
  IncrementLater: (model) => [model, Option.some(incrementLater)],
})

const view = (model: Model) =>
  div(
    [],
    [
      text(String(model.count)),
      button([OnClick(Decrement())], ['-']),
      button([OnClick(Increment())], ['+']),
      button([OnClick(IncrementLater())], ['+ in 1s']),
    ],
  )

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
