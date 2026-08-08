---
'@foldkit/ui': minor
---

Add `isReadOnly` to RadioGroup's `ViewConfig`.

A read-only group carries `aria-readonly` plus `data-readonly` on the group and `data-readonly` on each option. Arrow, `Home`, `End`, `PageUp`, and `PageDown` still move focus between options, while `Space` and clicking no longer change the selection. `isReadOnly` and `isDisabled` are independent, and either one prevents selection.
