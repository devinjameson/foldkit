---
'@foldkit/ui': minor
---

Export a `Bundle` type alongside every `create` factory, covering `Menu`, `Tabs`, `Listbox`, `Listbox.Multi`, `Combobox`, and `Combobox.Multi`.

Each factory declared its return type inline, so what `create` produced had no name. That stays invisible while the value is only ever called at module scope, since inference covers it. It surfaces when a consumer emits its own declarations: TypeScript has to write the factory's result into the generated `.d.ts`, and with no name to reference it expands the whole structure at every use site. Where that expansion reaches a type the consumer cannot name, the compiler refuses and reports the inferred type as not portable without an explicit annotation.

`Bundle` is that name. It takes the same type parameters as the factory that returns it, so `Menu.Bundle<Action>` describes exactly what `Menu.create<Action>()` produces, with `Action` threaded through `view`, `update`, and the programmatic helpers the same way.

Naming the result also makes a bundle something you can pass around rather than only call. A config object with a field typed `Combobox.Bundle<City>`, or a helper that accepts a created bundle instead of calling `create` itself, previously had no way to spell the annotation.

```ts
const ColorListbox = Listbox.create<Color>()

const toPickerView = (listbox: Listbox.Bundle<Color>, colors: ReadonlyArray<Color>): Html =>
  h.submodel({ view: listbox.view, viewInputs: { items: colors, ... }, ... })
```

Additive only. The object each factory builds is unchanged, every existing call site keeps compiling, and nothing needs updating to take the new type.

Thanks @IMax153 for contributing this fix!
