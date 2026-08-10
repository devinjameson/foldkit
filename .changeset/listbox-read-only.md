---
'@foldkit/ui': minor
---

Add `isReadOnly` to the view inputs of both Listbox variants.

A read-only Listbox emits `aria-readonly="true"` on the items panel and `data-readonly` on the wrapper, button, items panel, and every item. It still opens, navigates, and searches, but items carry no click handler and `Enter` or `Space` on the active item emits a `SuppressedItemCommit` Message instead of selecting. `isReadOnly` and `isDisabled` are independent.
