---
'foldkit': minor
---

Add the `OnKeyDownFocusOnly` attribute.

It takes a function from a key to `Option<string>`. A `Some` selector calls `preventDefault` and synchronously focuses the matching element, dispatching nothing; a `None` leaves the key to the browser. `OnKeyDownFocus` welds focus to dispatch, so there was no way to move focus without also committing a value. Menubars, toolbars, tab lists, and read-only radio groups all need that.
