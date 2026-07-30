---
'@foldkit/ui': minor
---

Add `isPlacementLocked` to `AnchorConfig`. It keeps the placement that an anchored panel resolves the first time it is positioned.

Foldkit uses Floating UI to position anchored panels. Its `autoUpdate` helper calls `computePosition` again when the trigger, panel, or viewport changes. The positioning call uses Floating UI middleware: `flip` can move the panel to another side when its preferred side overflows, `shift` moves it to keep it in view, and `size` reports the available space so Foldkit can constrain its height.

Without placement locking, `flip` runs after every observed change. A panel that changes height while it is open can therefore move from below the trigger to above it, and back again, as its content grows and shrinks. In a filterable dropdown this can happen on every keystroke. The panel can jump to the other side while the user types. Even if each placement is correct on its own, repeatedly switching sides disrupts what the user is reading and makes options harder to select.

When `isPlacementLocked` is true, the first positioning call can still choose the side with enough room. Later calls keep that resolved side. Scrolling and resizing still reposition the panel, and the panel still shrinks when its available space runs out, but it does not move to another side.

The same ticks write the locked side to `data-placement` on the floating element, as one of `'top'`, `'right'`, `'bottom'`, or `'left'`. A panel that opens upwards usually needs its content reversed, so that the row closest to the trigger stays closest to the trigger. With the side in an attribute, CSS can do this on its own, and the placement does not have to live in a Model.

`isPlacementLocked` defaults to false. Both behaviors only apply when it is true, so a caller that does not opt in is positioned exactly as before and gets no new attribute. It works in every component that already accepts an `anchor` config, including `Combobox`, `Listbox`, `Menu`, `Popover`, `Tooltip`, and `DatePicker`.

Thanks @wmaurer for contributing this feature!
