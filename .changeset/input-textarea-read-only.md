---
'@foldkit/ui': minor
---

Add `isReadOnly` to Input's and Textarea's `ViewConfig`.

A read-only field sets the native `readonly` attribute plus `data-readonly`, stays focusable and selectable, and omits its input handler. `isReadOnly` and `isDisabled` are independent, and either one removes the input handler.
