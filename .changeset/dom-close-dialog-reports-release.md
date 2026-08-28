---
'foldkit': patch
---

`Dom.closeDialog` now resolves to a boolean. It is `true` when the close released the focus trap, return focus, and stack entry that `Dom.showDialog` installed. It is `false` when the dialog held none. For example, this happens when the close runs before the show has finished. A caller that ignores the result needs no change.
