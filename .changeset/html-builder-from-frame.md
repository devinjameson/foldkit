---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/markdown': minor
'create-foldkit-app': minor
---

Supply the html builder from the render frame.

`html<Message>()` is removed. It returned a process-wide singleton cast to a caller-chosen type, so the Message type parameter was a phantom: the developer wrote it and the runtime ignored it. A shared view helper that named the app's Message worked at the root and broke inside a Submodel, because the boundary rejected the foreign Message when the handler fired. `Html` is not parameterized by Message, so nothing caught it at compile time.

The builder now comes from the frame that renders the view and cannot be conjured, so the Message type can no longer disagree with the boundary that will dispatch it.

## Migration

Views receive `h` as their last parameter. Delete the line that built it.

```ts
// before
export const view = (model: Model): Document => {
  const h = html<Message>()
  return h.div([], [h.button([h.OnClick(Clicked())], ['go'])])
}

// after
export const view = (model: Model, h: HtmlBuilder<Message>): Document =>
  h.div([], [h.button([h.OnClick(Clicked())], ['go'])])
```

The same applies to `crash.view`, which now takes `(context, h)`, and to `Scene.scene`'s `view`.

Submodel views take the builder after their view inputs:

```ts
// before
Submodel.defineView<Model, Message, ViewInputs>((model, viewInputs) => { ... })
// after
Submodel.defineView<Model, Message, ViewInputs>((model, viewInputs, h) => { ... })
```

A view helper defined at module level takes the builder as its last parameter, and callers pass it along:

```ts
const rowView = (item: Item, h: HtmlBuilder<Message>): Html => ...
```

A memoized helper receives it through the existing args array. The builder is referentially stable, so memoization is unaffected:

```ts
lazyRow(rowView, [item, h])
```

For handler-free Html built outside any view, typically at module top level, use `staticHtml`. It is typed `HtmlBuilder<never>`, so element and attribute constructors work while every event-handler constructor is uncallable:

```ts
import { staticHtml as h } from 'foldkit/html'

const badge = h.span([h.Class('badge')], ['beta'])
```

`@foldkit/ui` components take the consumer's builder as their last argument, and the explicit type argument goes away because it is inferred from the builder:

```ts
// before
Button.view<Message>({ toView, onClick: Clicked() })
// after
Button.view({ toView, onClick: Clicked() }, h)
```

`Canvas.view(config, h)` and the `CustomElement` spec's `withMessage(h)` follow the same shape.

`crash.view` receives `HtmlBuilder<never>`, not the app's builder. The crash view renders after the dispatch loop has stopped, so a Message it produced could never reach `update`. `never` makes that structural: `h.OnClick(...)` is a compile error rather than a handler that silently does nothing, and a reload control uses `h.Attribute('onclick', 'location.reload()')` as before.

`DragAndDrop.droppable` and `DragAndDrop.sortable` lose their type parameter and return `ReadonlyArray<Attribute<never>>`. Both produce only data attributes, never handlers, so `never` is the accurate Message type and the result flows into any Message universe by covariance. Drop the explicit type argument: `droppable<Message>(id)` becomes `droppable(id)`. `DragAndDrop.draggable` is unchanged and stays parameterized, because it does dispatch.

The stateless `@foldkit/ui` helpers name their type parameter `Message`. Button, Fieldset, Input, RadioGroup, Select, and Textarea previously called it `ParentMessage` while Checkbox, Disclosure, and Switch called it `Message`, though none of them opens a Submodel boundary, so there is no child Message for a parent to be named against. Components that do lift a child Message, such as DragAndDrop, keep `ParentMessage`. Type parameter names are not part of the type contract, so call sites are unchanged.

`h.submodel` now types the lift: `toParentMessage` must return the embedding builder's Message, where it previously returned `unknown`. Lifting into the wrong Message union is a compile error.

`childAttributes` and slotted Submodels are unchanged.

## Testing a view

A view can no longer be called directly in a test, because there is no way to produce a builder outside a render. Render through the `Scene` harness instead, which supplies one the same way the runtime does. Tests that asserted on the result of `view(model)` become tests that assert on what the scene rendered.

## What this does not cover

A view can still assign its builder to module state where another frame reads it. TypeScript cannot express the restriction that would prevent that, so treat a stored builder as a bug the types will not catch.
