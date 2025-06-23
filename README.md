# Foldkit

**Foldkit** is a composable toolkit for building structured user interfaces with [Effect](https://effect.website/) and TypeScript.

It draws inspiration from Elm, React, and functional architecture principles — enabling clear state transitions, precise side effects, and predictable UI.

> Like origami: simple parts become intricate when folded together.

---

## Packages

Foldkit is a modular monorepo of small, focused packages.

More details coming soon.

---

## Philosophy

Apps built with Foldkit unfold through messages — each one folded into state, predictably and purely.

- **Model first** — State is explicit, local, and testable.
- **Precise effects** — Side effects are described, not performed, using [Effect](https://effect.website/).
- **Composability > configuration** — Everything is just a value.

---

## Example

```ts
type Model = {
  count: number
}

type Message = Data.TaggedEnum<{
  Increment: {}
  Decrement: {}
}>

const Message = Data.taggedEnum<Message>()

const update = (model: Model) =>
  Match.type<Message>().pipe(
    Match.withReturnType<[Model, Option.Option<Cmd<Message>>]>(),
    Match.tagsExhaustive({
      Increment: () => [{ count: model.count + 1 }, Option.none()],
      Decrement: () => [{ count: model.count - 1 }, Option.none()],
    }),
  )

const view = (model: Model) =>
  div(
    [],
    [
      text(String(model.count)),
      button([OnClick(Message.Decrement())], ['-']),
      button([OnClick(Message.Increment())], ['+']),
    ],
  )

runApp<Model, Message>({
  init: { count: 0 },
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
- [ ] JSX/HTML support
- [ ] Suspense / async loading
- [ ] SSR target

---

## License

MIT
