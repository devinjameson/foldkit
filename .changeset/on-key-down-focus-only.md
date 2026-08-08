---
'foldkit': minor
---

Add the `OnKeyDownFocusOnly` attribute.

It takes a function from a key to `Option<string>`. A `Some` selector calls `preventDefault` and synchronously focuses the matching element, dispatching nothing; a `None` leaves the key to the browser. `OnKeyDownFocus` welds focus to dispatch, so a roving-tabindex widget that must move focus without committing a value, such as a read-only radio group, has no way to express that.
