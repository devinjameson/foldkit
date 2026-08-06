---
'@foldkit/ui': minor
---

Add `isReadOnly` to Switch's `ViewConfig`.

A read-only Switch emits `aria-readonly="true"` and `data-readonly`, remains focusable, and omits its click and Space handlers. `isReadOnly` and `isDisabled` are independent, and either one removes the interaction handlers.
