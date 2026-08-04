---
'@foldkit/ui': patch
---

Closing an already-closed Menu or Listbox no longer returns Commands. `closeMenu` and `closeListbox` had no open check, so `Closed` on a closed component returned `FocusButton` and focus jumped to a trigger whose panel was never open. A modal Menu or Listbox also returned `UnlockScroll` and `RestoreInert` for a scroll lock and an inert tree it never applied, the same pair leaked when the items container blurred while closed, and an animated component started a leave cascade for a panel that was not showing. Popover and Dialog already treat closing a closed Model as a no-op, and this brings Menu and Listbox in line with them.

An open Menu or Listbox is unchanged. It still returns `FocusButton`, still returns the modal Commands when `isModal` is set, still emits `Selected` on selection, and an animated one still runs its full leave cascade.

`SelectedItem` on a closed Menu or single-select Listbox still emits the `Selected` OutMessage. Selection is independent of the open-state transition: programmatic selection has no open precondition, and multi-select Listbox also emits while closed. This fix changes only the leaked Commands.

Thanks @artile!
