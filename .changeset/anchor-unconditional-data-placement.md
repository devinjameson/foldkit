---
'@foldkit/ui': minor
---

Write `data-placement` on every anchored panel, not only the placement-locked ones.

`anchorSetup` set `data-placement` inside the `isPlacementLocked` branch and removed it on cleanup under the same condition. A panel that did not opt into placement locking exposed nothing to CSS, so side-specific rules such as an arrow's edge styling or a `data-[placement=top]` reordering had no attribute to match. The only way to get the attribute was to lock the placement, which also drops `flip` from every later update. That is a positioning decision, unrelated to wanting to style the side the panel landed on.

The attribute is now written on every reposition. Without `isPlacementLocked` it tracks the side each update resolves to, including the ones `flip` moves. With `isPlacementLocked` it holds the locked side, exactly as before. Cleanup removes it either way.

This affects Popover, Tooltip, Listbox, Menu, Combobox, and DatePicker panels, all of which position through `anchorSetup`. Any `data-[placement=...]` rule already written against a panel that is not placement-locked was inert and now applies.
