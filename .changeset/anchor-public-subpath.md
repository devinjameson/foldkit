---
'@foldkit/ui': minor
---

Make the anchor positioning runtime public under a new `@foldkit/ui/anchor` subpath, so an application can build its own anchored component without rendering one of the six components that accept an `anchor` prop.

`AnchorConfig` was already re-exported as a type from `combobox`, `listbox`, `menu`, `popover` and `tooltip`, so a consumer could describe an anchor config but had no way to act on one. The subpath exports the runtime side alongside it:

```ts
import {
  AnchorConfig,
  Padding,
  Placement,
  anchorSetup,
  portalToContainingRoot,
} from '@foldkit/ui/anchor'
```

`anchorSetup` and `portalToContainingRoot` are plain DOM functions that return a cleanup, meant to be called inside `Effect.sync` in a Mount and stashed in the Mount result. `AnchorConfig`, `Placement` and `Padding` are now available as Schema values, not only as types.

The module is also exported from the root barrel, as `import { Anchor } from '@foldkit/ui'`, and appears in the API reference as `Ui.Anchor`.

Nothing is removed or renamed. `src/anchor.ts` moved to `src/anchor/`, which is internal layout only.

Thanks @wmaurer for contributing this feature!
