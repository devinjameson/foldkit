# Model

## One State Tree {#overview}

The Model is the complete application state in one immutable data structure. Everything the application can be at a moment lives here, rather than being divided between component-local and global stores.

In the [restaurant analogy](/core/architecture#the-restaurant-analogy), this is the waiter's notebook. The analogy is a memory aid; the literal contract is one state tree that every transition receives and returns.

The counter defines its Model with [Effect Schema](https://effect.website/docs/schema/introduction/):

::Snippet{name="counterModel" label="model example"}

`S.Struct` creates the runtime Schema. `typeof Model.Type` derives the TypeScript type from that same definition, so the runtime and compiler agree on the Model’s shape.

That runtime value matters because TypeScript types disappear after compilation. Foldkit uses the Model Schema to encode and decode state preserved across hot updates. The same Schema can validate unknown data at application boundaries.

## State with Variants

Use `defineTaggedUnion` when a Model field can be one of several named states. Declare the whole union in one record, then keep its constructors and matching on the union namespace:

::Snippet{name="modelTaggedUnion" label="Model state union example"}

`EditorMode` is both the runtime Schema nested in `Model` and the namespace for values such as `EditorMode.Browsing()`. Its `match` method requires a handler for every variant, so adding another editor mode points TypeScript at every place that must handle it.

Use `EditorMode.guards.Editing` to narrow one variant or `EditorMode.isAnyOf(['Editing', 'Previewing'])` to narrow a group. `EditorMode.subset(['Editing', 'Previewing'])` returns a Schema that accepts exactly those variants. A later variant cannot join the subset unless its tag is added. There is deliberately no `omit` operation.

Reach for `taggedStruct` only when one record cannot express the shape, such as a recursive union or a lone tagged struct that belongs to no union.

The counter starts with one field. When automatic counting becomes part of the application state, the Model grows to record it:

::Snippet{name="counterModelPreview" label="expanded model example"}

:::Info{label="Model the application, not the screen"}
Store facts the application needs to remember. Values used only to render one frame can usually be derived in view instead of becoming another Model field.
:::

The Model describes the current state. Every change begins with a [Message](/core/messages), a fact about something that happened.
