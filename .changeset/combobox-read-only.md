---
'@foldkit/ui': minor
---

Add `isReadOnly` to the view inputs of both Combobox variants.

A read-only Combobox emits the native `readonly` attribute plus `aria-readonly="true"` on the input, `aria-readonly="true"` on the items panel, and `data-readonly` on the wrapper, input, toggle button, items panel, and every item. It still opens, navigates, and closes, and the input still takes focus and allows text selection and copying. Five paths that would change the parent's selection close: typing is frozen, items carry no click handler, `Enter` on the active item emits a `SuppressedItemCommit` Message instead of selecting, an `immediate` Combobox stops committing as the arrow keys move, and a nullable Combobox no longer emits `ClearedSelection` when a user close finds an empty input. `itemToConfig`'s context gains `isReadOnly`, so an item can style itself for the state without closing over the view inputs.

`Closed`, `BlurredInput`, and `PressedToggleButton` gained an `isClearable` field, since the close path lives in `update` and cannot see `isReadOnly`, which is a view input. The view passes it, and the programmatic `close` helpers pass `true`, so `close(model)` clears exactly as before.

Typing is frozen rather than left to filter because `inputValue` is both the filter query and the display of the selection, so a typable read-only Combobox would have a visible value the user can change.

`isReadOnly` and `isDisabled` are independent: setting both emits both attribute sets, and `isDisabled` still wins for interaction, since it drops every handler, so a Combobox that is both read-only and disabled cannot be opened at all.
