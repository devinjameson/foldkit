---
'@foldkit/ui': minor
---

Add `isReadOnly` to the view inputs of both Listbox variants.

A read-only Listbox emits `aria-readonly="true"` on the items panel and `data-readonly` on the wrapper, button, items panel, and every item. It still opens, navigates, and searches, but items carry no click handler and `Enter` or `Space` on the active item emits a `SuppressedItemCommit` Message instead of selecting. `itemToConfig`'s context gains `isReadOnly`, so an item can style itself for the state without closing over the view inputs.

`isReadOnly` and `isDisabled` are independent: setting both emits both attribute sets, and `isDisabled` still wins for interaction, since its button drops every handler, so a Listbox that is both read-only and disabled cannot be opened at all.
