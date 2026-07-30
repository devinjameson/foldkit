---
'@foldkit/ui': minor
---

Add `isPlacementLocked` to `AnchorConfig`. It keeps the placement that an anchored panel resolves the first time it is positioned.

`flip` runs on every `autoUpdate` tick. So a panel that changes height while it is open can move from below the trigger to above it, and back again, as the content grows and shrinks. In a filterable dropdown this happens on every keystroke. The panel jumps to the other side while the user types, and the option under the pointer moves away. Each flip is correct on its own, but the sequence is not, because the user is already reading the panel.

When `isPlacementLocked` is true, the first `computePosition` still runs with `flip`. It keeps the preferred placement when it fits and chooses a fallback when it overflows. Every later tick then asks for the resolved placement directly, without `flip`. Scrolling and resizing still move the panel, but nothing can move it to another side. `shift` and `size` still run, so the panel still shrinks when the space around it runs out.

The same ticks write the locked side to `data-placement` on the floating element, as one of `'top'`, `'right'`, `'bottom'`, or `'left'`. A panel that opens upwards usually needs its content reversed, so that the row closest to the trigger stays closest to the trigger. With the side in an attribute, CSS can do this on its own, and the placement does not have to live in a Model.

`isPlacementLocked` defaults to false. Both behaviors only apply when it is true, so a caller that does not opt in is positioned exactly as before and gets no new attribute. It works in every component that already accepts an `anchor` config, including `Combobox`, `Listbox`, `Menu`, `Popover`, `Tooltip`, and `DatePicker`.

Thanks @wmaurer!
