---
'@foldkit/ui': minor
---

Stop a multi-select Combobox emitting `ClearedSelection` when it closes.

`handleClose` read an empty `inputValue` on close as the user having cleared the selection. That inference holds for single-select, where the input displays the current selection and the user has to empty it deliberately. It never held for multi-select, whose `restingInputValue` is an empty string by design, so the condition was true on every close. A nullable multi-select therefore wiped the parent's whole selection each time it closed, by `Escape`, blur, the toggle button, or a backdrop click, without the user doing anything to ask for it.

Multi-select now never emits `ClearedSelection`. Clearing a multi-select is toggling its values off, one `Selected` at a time, which is the channel it already had. Single-select is unchanged, and `nullable` continues to govern its empty-input close.
