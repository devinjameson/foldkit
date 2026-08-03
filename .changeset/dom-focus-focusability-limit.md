---
'foldkit': patch
---

Document what `Dom.focus`'s commit gate does not cover.

Waiting for the commit puts the element in the DOM. It does not make the element focusable, and `.focus()` is a no-op on an element that is not rendered. A target that something asynchronous reveals after the render commits, such as a panel held at `visibility: hidden` until a positioning library resolves its first layout, is still hidden when the Command runs, however long the Command waits. Focus a target like that from whatever performs the reveal.
