---
'@foldkit/ui': minor
---

Export the Message constructors that `Combobox`, `Listbox`, `Menu`, `Popover`, and `Slider` only re-exported as types.

Each of these barrels listed part of its Message union under `export type { ... }`. That re-exports the type and shadows the value, so the constructor was unreachable even though it was implemented and exported from the module behind the barrel. The deep import path resolved to the same barrel, so there was no way around it.

```ts
import { Combobox } from '@foldkit/ui'

typeof Combobox.Selected // 'function'
typeof Combobox.UpdatedInputValue // was 'undefined', now 'function'
```

42 constructors across the five components are now callable. Each already had both a `const` and a matching type alias in its source module, so a value re-export carries the type as well and nothing that referenced these names as types has to change.

| Namespace  | Union members | Previously constructible | Restored |
| ---------- | ------------- | ------------------------ | -------- |
| `Combobox` | 22            | 13                       | 9        |
| `Listbox`  | 24            | 13                       | 11       |
| `Menu`     | 25            | 13                       | 12       |
| `Popover`  | 15            | 11                       | 4        |
| `Slider`   | 6             | 0                        | 6        |

This matters for writing a headless `Story` against a component that embeds one of these, where driving the component means dispatching its Messages. It also matters for tooling that reads a Message union as a schema, such as the DevTools surface, which advertised tags that could not be built.

`AnchorConfig` stays type-only, since exposing the schema value is the subject of a separate question about the anchor runtime surface. So do the `ActivationTrigger` and `ActivationMode` literal schemas, which name no Message and need no constructor. `Orientation` is a literal schema of the same kind, already exported as a value by `Listbox` and type-only on `Tabs`, and this change leaves both as they were.

A test now audits every component barrel and fails when a Message union declares a tag the barrel does not export as a callable.

Thanks @artile for the report.
