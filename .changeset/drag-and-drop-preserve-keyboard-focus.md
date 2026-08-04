---
'@foldkit/ui': patch
---

Preserve focus on a draggable item after each keyboard move. Moving a lifted item re-renders it at its next position and can replace or detach the focused element, which previously left focus on the document body until the drag was dropped or cancelled. DragAndDrop now focuses the item again after resolving every keyboard move, matching its existing drop and cancel behavior.

Thanks @artile!
