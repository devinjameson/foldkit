---
'@foldkit/ui': minor
---

Widen `AnchorConfig.padding` to accept a partial per-side object alongside the existing scalar, mirroring `@floating-ui/dom`'s `Padding` type. A number still pads every side uniformly; `{ top: 88, right: 16, bottom: 16, left: 16 }` bounds each side independently. The value is forwarded unchanged to the `flip`, `shift`, and `size` middleware.

With a single scalar, a panel that `flip` moves above its button can slide to within that scalar of the viewport top, under fixed chrome such as a sticky site header, which then paints over the panel. Per-side padding gives the top the extra clearance the header needs while the other sides keep the tighter viewport bound.
