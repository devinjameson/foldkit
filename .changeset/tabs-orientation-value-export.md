---
'@foldkit/ui': minor
---

Export `Orientation` as a value from `Tabs`, matching `Listbox` and `RadioGroup`.

Three components define an `Orientation` literal schema for the same consumer-facing config field. `Listbox` and `RadioGroup` re-exported it from their barrel as a value. `Tabs` listed it under `export type { ... }`, which re-exports the type and shadows the value, so the schema was unreachable.

```ts
import { Tabs } from '@foldkit/ui'

typeof Tabs.Orientation // was 'undefined', now 'function'
```

`ActivationMode` on `Tabs` and `ActivationTrigger` on `Combobox`, `Listbox`, and `Menu` stay type-only. No barrel exports either of them as a value, so they are already consistent, and promoting them would widen the public surface rather than settle a disagreement between barrels. `AnchorConfig` stays type-only as well, since its runtime side is the subject of a separate question about the anchor surface.
