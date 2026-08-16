---
'@foldkit/ui': minor
---

Name the config `anchorSetup` takes, and give `Placement` and `Padding` type companions, so the `@foldkit/ui/anchor` surface can be described without reaching for `Parameters` or `typeof`.

```ts
import type { Padding, Placement, SetupConfig } from '@foldkit/ui/anchor'
```

`SetupConfig` matches the `InitConfig` and `ViewInputs` types the stateful components export. `Placement` and `Padding` each export a type of the same name alongside their Schema value, the way `AnchorConfig` already did.

`anchorSetup` takes the element first, as `anchorSetup(element, config)`, matching `portalToContainingRoot(element)`.
