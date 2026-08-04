---
'@foldkit/ui': patch
---

Closing an already-closed Popover no longer returns commands. `RequestedClose` on a closed Popover returned the caller's command list unchanged, so the `FocusButton` command survived and focus jumped to a trigger whose panel was never open. A modal Popover also returned `UnlockScroll` and `RestoreInert` for a scroll lock and an inert tree it never applied, and the same leak reached `BlurredPanel`. The docs already described `Popover.close` on a closed model as a no-op, and Dialog already behaves that way, so this brings the code in line with both.

An open Popover is unchanged. It still returns `FocusButton`, still returns the modal commands when `isModal` is set, still emits `Closed`, and an animated Popover still runs its full leave cascade. Only the already-closed path changed, and it now returns an empty command list and no OutMessage, matching `RequestedOpen` on an already-open Popover.

DatePicker picks this up for free, since its `Closed` message delegates to `Popover.close`.
